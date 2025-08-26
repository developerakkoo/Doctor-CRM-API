// controllers/medicalOwner.controller.js
import MedicalOwner from '../../Modals/medicalOwner/medicalOwner.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import QRcode from 'qrcode';
import xlsx from 'xlsx';
import Medicine from '../../Modals/medicalOwner/medicine.js';

import Counter from '../../Modals/medicalOwner/counterowner.js';
import Bill from '../../Modals/medicalOwner/bill.js';
// import Medicine from '../../Models/medicine.model.js';

import Patient from "../../Modals/patient/patient.js";


export const registerMedicalOwner = async (req, res) => {
  const {
    fullName,
    email,
    password,
    phone,
    shopName,
    address,
    linkedDoctorId
  } = req.body;

  try {
    // Check if medical owner already exists
    const existing = await MedicalOwner.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Medical owner already exists with this email.' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate TOTP secret
    const secret = speakeasy.generateSecret({ name: `Doctor-CRM (${email})` });

    // Create new medical owner
    const newOwner = new MedicalOwner({
      fullName,
      email,
      password: hashedPassword,
      phone,
      shopName,
      address,
      linkedDoctorId,
      totpSecret: secret.base32
    });

    await newOwner.save();

    // Generate QR code for Google Authenticator
    const qrCodeDataURL = await QRcode.toDataURL(secret.otpauth_url);

    // Return profile (without password or secret)
    const { password: pw, totpSecret, ...profile } = newOwner.toObject();

    res.status(201).json({
      message: 'Medical Owner registered successfully.',
      profile,
      qrCode: qrCodeDataURL,     // For scanning with Google Authenticator
      manualCode: secret.base32  // For manual setup
    });

  } catch (err) {
    res.status(500).json({ message: 'Registration failed', error: err.message });
  }
};

export const loginMedicalOwner = async (req, res) => {
  const { email, password, totp } = req.body;

  try {
    const owner = await MedicalOwner.findOne({ email });
    if (!owner) return res.status(404).json({ message: 'Medical Owner not found' });

    const isMatch = await bcrypt.compare(password, owner.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    // Add this before speakeasy.totp.verify()
    console.log('Expected TOTP:', speakeasy.totp({
      secret: owner.totpSecret,
      encoding: 'base32'
    }));


    const isTotpValid = speakeasy.totp.verify({
      secret: owner.totpSecret,
      encoding: 'base32',
      token: totp,
      window: 1  // 30 seconds before/after
    });

    if (!isTotpValid) return res.status(401).json({ message: 'Invalid or expired TOTP' });

    const token = jwt.sign(
      { ownerId: owner._id, role: 'medicalOwner' },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    const { password: pw, totpSecret, ...profile } = owner.toObject();

    res.status(200).json({ token, profile });

  } catch (err) {
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
};

export const getMedicalOwnerProfile = async (req, res) => {
  try {
    res.json(req.medicalOwner);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch profile', error: err.message });
  }
};

export const updateMedicalOwnerProfile = async (req, res) => {
  const { contactInfo, businessName } = req.body;

  try {
    const ownerId = req.medicalOwner?._id;

    const updated = await MedicalOwner.findByIdAndUpdate(
      ownerId,
      {
        ...(contactInfo && { phone: contactInfo }),
        ...(businessName && { shopName: businessName })
      },
      { new: true }
    ).select('-password -totpSecret');

    if (!updated) {
      return res.status(404).json({ message: 'Medical Owner not found' });
    }

    res.status(200).json({
      message: 'Profile updated successfully',
      profile: updated
    });

  } catch (err) {
    res.status(500).json({ message: 'Profile update failed', error: err.message });
  }
};

export const uploadMedicineExcel = async (req, res) => {
  try {
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    const ownerId = req.medicalOwner._id;

    const medicinePromises = data.map(async (item) => {
      const existing = await Medicine.findOne({
        name: item.name,
        brand: item.brand,
        medicalOwnerId: ownerId,
      });

      if (existing) {
        // update quantity and price
        existing.quantity = item.quantity;
        existing.price = item.price;
        existing.expiryDate = item.expiryDate;
        return existing.save();
      } else {
        return Medicine.create({
          name: item.name,
          brand: item.brand,
          price: item.price,
          quantity: item.quantity,
          expiryDate: item.expiryDate,
          medicalOwnerId: ownerId,
        });
      }
    });

    await Promise.all(medicinePromises);
    res.status(200).json({ message: 'Medicines uploaded/updated successfully.' });

  } catch (err) {
    res.status(500).json({ message: 'Failed to upload Excel', error: err.message });
  }
};

export const addMedicine = async (req, res) => {
  try {
    const ownerId = req.medicalOwner._id;
    const { name, brand, price, quantity, expiryDate } = req.body;

    if (!name || !brand || !price || !quantity || !expiryDate) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const existing = await Medicine.findOne({ name, brand, medicalOwnerId: ownerId });

    if (existing) {
      return res.status(400).json({ message: 'Medicine already exists. Use update or Excel upload.' });
    }

    const newMedicine = new Medicine({
      name,
      brand,
      price,
      quantity,
      expiryDate,
      medicalOwnerId: ownerId,
    });

    await newMedicine.save();

    res.status(201).json({ message: 'Medicine added successfully.', medicine: newMedicine });
  } catch (err) {
    res.status(500).json({ message: 'Failed to add medicine', error: err.message });
  }
};

export const getMedicines = async (req, res) => {
  try {
    const ownerId = req.medicalOwner._id;
    const search = req.query.search || '';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const query = {
      medicalOwnerId: ownerId,
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } }
      ]
    };

    const total = await Medicine.countDocuments(query);
    const medicines = await Medicine.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ expiryDate: 1 });

    res.status(200).json({
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      medicines,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch medicines', error: err.message });
  }
};

export const updateMedicineDetails = async (req, res) => {
  try {
    const { medicineId } = req.params;
    const ownerId = req.medicalOwner._id;

    const updates = req.body;

    const medicine = await Medicine.findOneAndUpdate(
      { _id: medicineId, medicalOwnerId: ownerId },
      updates,
      { new: true }
    );

    if (!medicine) {
      return res.status(404).json({ message: 'Medicine not found or not owned by you' });
    }

    res.status(200).json({ message: 'Medicine updated successfully', medicine });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update medicine', error: err.message });
  }
};
export const deleteMedicine = async (req, res) => {
  try {
    const { medicineId } = req.params;
    const ownerId = req.medicalOwner._id;

    const deleted = await Medicine.findOneAndDelete({
      _id: medicineId,
      medicalOwnerId: ownerId,
    });

    if (!deleted) {
      return res
        .status(404)
        .json({ message: 'Medicine not found or not owned by you' });
    }

    res.status(200).json({ message: 'Medicine deleted successfully' });
  } catch (err) {
    res.status(500).json({
      message: 'Failed to delete medicine',
      error: err.message,
    });
  }
};

export const generateBill = async (req, res) => {
  try {
    const { patientId, items, totalAmount, paymentStatus } = req.body;
    const medicalOwnerId = req.medicalOwner._id;

    // Step 1: Validate medicines and reduce stock
    const itemDetails = await Promise.all(
      items.map(async (item) => {
        const medicine = await Medicine.findOne({
          _id: item.medicineId,
          medicalOwnerId,
        });

        if (!medicine) {
          throw new Error(`Medicine not found: ${item.medicineId}`);
        }

        if (medicine.quantity < item.quantity) {
          throw new Error(`Insufficient stock for medicine: ${medicine.name}`);
        }

        medicine.quantity -= item.quantity;
        await medicine.save();

        return {
          medicineId: medicine._id,
          quantity: item.quantity,
          price: medicine.price,
        };
      })
    );

    // Step 2: Generate auto-incremented bill number from `value` only
    const counter = await Counter.findOneAndUpdate(
      { name: 'bill' },
      { $inc: { value: 1 } },
      { new: true, upsert: true }
    );

    if (!counter || typeof counter.value !== 'number' || isNaN(counter.value)) {
      counter.value = 1;
      await counter.save();
    }

    const billNo = `BILL${counter.value}`;

    // Step 3: Create the bill
    const bill = await Bill.create({
      billNo,
      patientId,
      medicalOwnerId,
      items: itemDetails,
      totalAmount,
      paymentStatus,
    });

    // Step 4: Return the response
    res.status(201).json({
      message: 'Bill generated',
      billId: bill._id,
      billNo: bill.billNo,
      bill,
    });

  } catch (err) {
    console.error('Error in generateBill:', err);
    res.status(500).json({
      message: 'Failed to generate bill',
      error: err.message,
    });
  }
};



export const getBillById = async (req, res) => {
  try {
    const { billId } = req.params;

    // Find the bill by ID and populate medicine details
    const bill = await Bill.findById(billId).populate('items.medicineId');

    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    // Fetch patient details
    const patient = await Patient.findById(bill.patientId).select('fullName _id patientId');

    res.status(200).json({
      message: "Bill retrieved successfully",
      billId: bill._id,
      billNo: bill.billNo, // explicitly return the bill number
      bill,
      patient: patient || null
    });

  } catch (error) {
    console.error("Error fetching bill:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const generatePaymentQRCode = async (req, res) => {
  try {
    const { billId, amount, type } = req.body;

    const bill = await Bill.findById(billId);
    if (!bill) return res.status(404).json({ message: 'Bill not found' });

    const paymentData = `upi://pay?pa=medstore@upi&pn=MedicalStore&am=${amount}&cu=INR`;

    if (type === 'QR') {
      const qrImageUrl = await QRCode.toDataURL(paymentData);
      return res.status(200).json({
        paymentType: 'QR',
        qrBase64: qrImageUrl,  // OR store and serve image if needed
      });
    } else if (type === 'UPI') {
      return res.status(200).json({
        paymentType: 'UPI',
        upiLink: paymentData,
      });
    } else if (type === 'Link') {
      const dummyLink = `https://pay.medstore.in/pay?billId=${billId}&amt=${amount}`;
      return res.status(200).json({
        paymentType: 'Link',
        link: dummyLink,
      });
    } else {
      return res.status(400).json({ message: 'Invalid payment type' });
    }
  } catch (error) {
    console.error('Error generating payment QR/link:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
