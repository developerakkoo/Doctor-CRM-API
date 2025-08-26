import SubAdmin from '../../Modals/subadmin/subadmin.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
// import { verifyTotp } from '../../utils/totp.js';
import { authenticator } from 'otplib';





export const registerSubAdmin = async (req, res) => {
  try {
    const doctorId = req.doctor._id;
    const { fullName, email, password, designation, accessLevel } = req.body;

    const existing = await SubAdmin.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already exists' });

    const totpSecret = authenticator.generateSecret();

    const subAdmin = new SubAdmin({
      fullName,
      email,
      password,
      designation,
      accessLevel,
      doctorId
    });

    await subAdmin.save();

    res.status(201).json({
      message: 'Sub-admin registered successfully',
      subAdmin: {
        _id: subAdmin._id,
        fullName: subAdmin.fullName,
        email: subAdmin.email,
        designation: subAdmin.designation,
        accessLevel: subAdmin.accessLevel ,
        totpEnabled: subAdmin.totpEnabled,

      }
    });
  } catch (err) {
    console.error('Register SubAdmin Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getAllSubAdmins = async (req, res) => {
  try {
    const doctorId = req.doctor._id;

    const subAdmins = await SubAdmin.find({ doctorId }).select('-password'); // exclude passwords

    res.status(200).json({ subAdmins });
  } catch (err) {
    console.error('Get All SubAdmins Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getSubAdminById = async (req, res) => {
  try {
    const doctorId = req.doctor._id; // from verified JWT
    const { subAdminId } = req.params;

    const subAdmin = await SubAdmin.findOne({
      _id: subAdminId,
      doctorId
    }).select('-password');

    if (!subAdmin) {
      return res.status(404).json({ message: 'Sub-admin not found' });
    }

    res.status(200).json({ subAdmin });
  } catch (err) {
    console.error('Get SubAdmin By ID Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateSubAdmin = async (req, res) => {
  try {
    const { subAdminId } = req.params;
    const doctorId = req.doctor._id; // From token
    const { fullName, designation, accessLevel, phone, address } = req.body;

    // Ensure doctor can only update their own staff
    const subAdmin = await SubAdmin.findOne({ _id: subAdminId, doctorId });
    if (!subAdmin) {
      return res.status(404).json({ message: 'Sub-admin not found or unauthorized' });
    }

    if (fullName) subAdmin.fullName = fullName;
    if (designation) subAdmin.designation = designation;
    if (accessLevel) subAdmin.accessLevel = accessLevel;
    if (phone) subAdmin.phone = phone;
    if (address) subAdmin.address = address;

    await subAdmin.save();

    res.status(200).json({
      message: 'Sub-admin updated successfully',
      subAdmin: {
        _id: subAdmin._id,
        fullName: subAdmin.fullName,
        email: subAdmin.email,
        designation: subAdmin.designation,
        accessLevel: subAdmin.accessLevel,
        phone: subAdmin.phone,
        address: subAdmin.address
      }
    });
  } catch (err) {
    console.error('Update SubAdmin Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteSubAdmin = async (req, res) => {
  try {
    const { subAdminId } = req.params;
    const doctorId = req.doctor._id; // From JWT token

    const subAdmin = await SubAdmin.findOneAndDelete({ _id: subAdminId, doctorId });

    if (!subAdmin) {
      return res.status(404).json({ message: 'Sub-admin not found or unauthorized' });
    }

    res.status(200).json({ message: 'Sub-admin deleted successfully' });
  } catch (err) {
    console.error('Delete SubAdmin Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};




export const loginSubAdmin = async (req, res) => {
  try {
    const { email, password, totp } = req.body;

    const subAdmin = await SubAdmin.findOne({ email }).select('+password +totpSecret +totpEnabled');
    if (!subAdmin) return res.status(404).json({ message: 'Sub-admin not found' });
    console.log('Found sub-admin:', subAdmin);

    console.log('Entered password:', password);
    console.log('Stored hashed password:', subAdmin.password);

    console.log("Raw entered password:", password);
    console.log("Trimmed password:", password.trim());
    console.log("Stored hash:", subAdmin.password);

      // password
    const isMatch = await bcrypt.compare(password.trim(), subAdmin.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    //  TOTP Verification (if enabled)
    if (subAdmin.totpEnabled) {
      if (!totp) {
        return res.status(400).json({ message: 'TOTP token required' });
      }
      const isTotpValid = authenticator.verify({ token: totp, secret: subAdmin.totpSecret });
      if (!isTotpValid) {
        return res.status(401).json({ message: 'Invalid TOTP token' });
      }
    }

    const token = jwt.sign(
      {
        subAdminId: subAdmin._id,
        role: 'sub-admin',
        accessLevel: subAdmin.accessLevel
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    const { password: pw, totpSecret, ...profile } = subAdmin.toObject();

    res.status(200).json({
      message: 'Login successful',
      token,
      profile: {
        _id: subAdmin._id,
        fullName: subAdmin.fullName,
        email: subAdmin.email,
        designation: subAdmin.designation,
        accessLevel: subAdmin.accessLevel
      }
    });
  } catch (err) {
    console.error('Sub-admin login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};