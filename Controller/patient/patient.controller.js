import dotenv from 'dotenv';
dotenv.config();

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Patient from '../../Modals/patient/patient.js'; // adjust path as needed
// import Doctor from '../../Modals/doctor/doctor.js';
import { generateReportPDF } from '../../utils/pdfGenerator.js';
import { generatePrescriptionPDF } from '../../utils/prescriptionPdf.js';
import { generateBillPDF } from '../../utils/generateBillPDF.js';
import Appointment from '../../Modals/patient/appointment.js';
import mongoose from 'mongoose';
import Counter from '../../Modals/patient/counter.js'; // adjust path accordingly
import Doctor from '../../Modals/doctor/Doctor.js';

const JWT_SECRET = process.env.JWT_SECRET;

// Create new patient
export const createPatient = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      dob,
      insuranceProvider,
      address,
      source,
      priority,
      initialStatus,
      referredBy,
      initialNotes,
      password
    } = req.body;

    if (!req.doctor?._id) {
      return res.status(401).json({ message: "Unauthorized: Doctor ID missing" });
    }

    // Check duplicates
    const existingEmail = await Patient.findOne({ email });
    if (existingEmail) return res.status(400).json({ message: "Email already in use" });

    const existingPhone = await Patient.findOne({ phone });
    if (existingPhone) return res.status(400).json({ message: "Phone already in use" });

    // ✅ Generate patientId
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    const seq = Math.floor(1000 + Math.random() * 9000); // 4-digit random
    const generatedPatientId = `PAT${dateStr}${seq}`;

    // ✅ Normalize status
    const normalizedStatus = initialStatus
      ? initialStatus.trim().toLowerCase()
      : "contact"; // default

    const newPatient = new Patient({
      firstName,
      lastName,
      email,
      phone,
      dob,
      insuranceProvider,
      address,
      source,
      priority,
      initialStatus: normalizedStatus,
      status: normalizedStatus, // ✅ Always set status from initialStatus
      referredBy,
      initialNotes,
      password,
      doctorId: req.doctor._id,
      createdBy: req.doctor._id,
      patientId: generatedPatientId
    });

    await newPatient.save();

    res.status(201).json({
      message: "Patient created successfully",
      patient: {
        _id: newPatient._id,
        patientId: newPatient.patientId,
        firstName: newPatient.firstName,
        lastName: newPatient.lastName,
        email: newPatient.email,
        phone: newPatient.phone,
        dob: newPatient.dob,
        insuranceProvider: newPatient.insuranceProvider,
        source: newPatient.source,
        priority: newPatient.priority,
        status: newPatient.status // ✅ Return unified status
      }
    });
  } catch (err) {
    console.error("Create Patient Error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};


// Login Patient
export const loginPatient = async (req, res) => {
  const { patientId, password } = req.body;

  try {
    if (!patientId || !password) {
      return res.status(400).json({ message: 'Patient ID and password are required' });
    }

    const patient = await Patient.findOne({ patientId }).select('+password');
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    const isMatch = await bcrypt.compare(password, patient.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { patientId: patient.patientId, role: 'patient' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password: _, ...patientData } = patient.toObject();

    res.status(200).json({
      message: 'Login successful',
      token,
      patient: patientData,
    });

  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Patient login

// Get logged-in patient profile
export const getPatientProfile = async (req, res) => {
  try {
    const { patientId } = req.patient;

    const patient = await Patient.findOne({ patientId })
      .select('-password')
      .populate('reports.uploadedBy', 'email')
      .populate('prescriptions.prescribedBy', 'email');

    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    res.status(200).json({ patient });
  } catch (err) {
    console.error('Error fetching patient profile:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update logged-in patient profile
export const updatePatientProfile = async (req, res) => {
  try {
    const { phone, address, medicalHistory, allergies, currentMedications } = req.body;

    const updated = await Patient.findOneAndUpdate(
      { patientId: req.patient.patientId },
      {
        ...(phone && { phone }),
        ...(address && { address }),
        ...(medicalHistory && { medicalHistory }),
        ...(allergies && { allergies }),
        ...(currentMedications && { currentMedications }),
      },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updated) return res.status(404).json({ message: 'Patient not found' });

    res.status(200).json({ message: 'Profile updated successfully', patient: updated });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get reports of logged-in patient
export const getReportsByPatient = async (req, res) => {
  try {
    const { patientId } = req.patient;

    const patient = await Patient.findOne({ patientId })
      .select('reports')
      .populate('reports.uploadedBy', 'email');

    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    res.json({ reports: patient.reports });
  } catch (err) {
    console.error('Error fetching reports:', err);
    res.status(500).json({ message: 'Server error while fetching reports' });
  }
};

// Doctor or Patient can add report (role-based)
export const addReport = async (req, res) => {
  try {
    const { patientId, title, findings, date } = req.body;
    console.log("Incoming report body:", req.body);

    const patient = await Patient.findOne({ patientId });
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    console.log("Found patient:", patient.fullName);

    const pdfUrl = await generateReportPDF({
      title,
      findings,
      date,
      patient,
      doctor: req.doctor  // Assuming doctor is authenticated
    });

    const newReport = {
      title,
      date,
      findings,
      fileUrl: pdfUrl,
      uploadedBy: req.doctor._id
    };

    patient.reports.push(newReport);
    await patient.save();

    res.status(201).json({ message: 'Report added and PDF generated', report: newReport });
  } catch (err) {
    console.error('Report Generation Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
// Optional: create test patient (for development)
export const createTestPatient = async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash('test1234', 10);

    const newPatient = new Patient({
      createdBy: '685ba56d36b6497095e82b0f', // replace if needed
      fullName: 'John Test',
      patientId: 'PAT123',
      password: hashedPassword,
      gender: 'Male',
      dob: new Date('1995-01-01'),
      phone: '9999999999',
      address: 'Demo City',
      medicalHistory: 'Asthma',
      allergies: ['Dust'],
      currentMedications: ['Inhaler']
    });

    await newPatient.save();

    res.status(201).json({ message: 'Test patient created successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create test patient' });
  }
};

export const getPrescriptionsByPatient = async (req, res) => {
  try {
    const { patientId } = req.patient;

    const patient = await Patient.findOne({ patientId })
      .select('prescriptions')
      .populate('prescriptions.prescribedBy', 'email fullName');

    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    res.status(200).json({ prescriptions: patient.prescriptions });
  } catch (err) {
    console.error('Error fetching prescriptions:', err);
    res.status(500).json({ message: 'Server error while fetching prescriptions' });
  }
};

export const getPatientBills = async (req, res) => {
  try {
    const patient = await Patient.findOne({ patientId: req.patient.patientId });

    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    res.status(200).json({ bills: patient.bills });
  } catch (err) {
    console.error("Get Bills Error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const addPrescription = async (req, res) => {
  try {
    const { patientId, medication, dosage, duration, date } = req.body;

    const patient = await Patient.findOne({ patientId });
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    const newPrescription = {
      medication,
      dosage,
      duration,
      date: new Date(date),
      prescribedBy: req.doctor._id, // From JWT middleware
    };

    patient.prescriptions.push(newPrescription);
    await patient.save();

    res.status(201).json({
      message: 'Prescription added successfully',
      prescription: newPrescription,
    });
  } catch (err) {
    console.error('Error adding prescription:', err);
    res.status(500).json({ message: 'Server error while adding prescription' });
  }
};


export const addBill = async (req, res) => {
  try {
    const { patientId, date, services, totalAmount } = req.body;

    // 1. Find the patient
    const patient = await Patient.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // 2. Validate services array
    if (!Array.isArray(services) || services.some(s => !s.name || typeof s.cost !== 'number')) {
      return res.status(400).json({ message: 'Invalid services format' });
    }

    // 3. Get the next unique bill number
    const counter = await Counter.findOneAndUpdate(
      { name: 'bill' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    const billNo = counter.seq;

    // 4. Generate a unique ObjectId for this bill
    const billId = new mongoose.Types.ObjectId();

    // 5. Generate PDF and get file URL
    const pdfUrl = await generateBillPDF({
      patient,
      doctor: req.doctor,
      date,
      services,
      totalAmount,
      billNo
    });

    // 6. Create bill object with billId
    const newBill = {
      _id: billId,
      billNo,
      date: new Date(date),
      services,
      totalAmount: Number(totalAmount),
      fileUrl: pdfUrl,
      billedBy: req.doctor._id
    };

    // 7. Save into patient's bills array
    patient.bills.push(newBill);
    await patient.save();

    // 8. Respond
    res.status(201).json({ message: 'Bill added', bill: newBill });

  } catch (err) {
    console.error('Billing Error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const scheduleAppointment = async (req, res) => {
  try {
    const patientId = req.patient.patientId;
    const { doctorId, preferredDate, preferredTime, reason } = req.body;

    if (!doctorId || !preferredDate || !preferredTime || !reason) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: doctorId, preferredDate, preferredTime, reason'
      });
    }

    const appointment = new Appointment({
      patientId,
      doctorId,
      preferredDate,
      preferredTime,
      reason
    });

    await appointment.save();

    res.status(201).json({
      success: true,
      message: 'Appointment request submitted successfully',
      appointment
    });

  } catch (error) {
    console.error('Error scheduling appointment:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getTodaysAppointmentsForPatient = async (req, res) => {
  try {
    const rawId = req.patient?.patientId || req.user?.patientId || req.user?.id;
    if (!rawId) {
      return res.status(401).json({ success: false, message: "Unauthorized access" });
    }

    let patient;
    if (mongoose.Types.ObjectId.isValid(rawId)) {
      patient = await Patient.findOne({ userId: rawId }).populate("appointments.doctorId");
      if (!patient) {
        patient = await Patient.findById(rawId).populate("appointments.doctorId");
      }
    } else {
      patient = await Patient.findOne({ patientId: rawId }).populate("appointments.doctorId");
    }

    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }

    // Start and end of today in UTC
    const now = new Date();
    const startOfDayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    const endOfDayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

    const todaysAppointments = (patient.appointments || []).filter(appt => {
      const apptDate = new Date(appt.appointmentDate);
      return apptDate >= startOfDayUTC && apptDate <= endOfDayUTC;
    });

    return res.status(200).json({
      success: true,
      count: todaysAppointments.length,
      appointments: todaysAppointments
    });

  } catch (error) {
    console.error("Error fetching today's appointments for patient:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


export const createPatientAppointment = async (req, res) => {
  try {
    const { doctorId, appointmentDate, reason } = req.body;
    const jwtPatientId = req.patient?.patientId; // patientId from JWT
    const jwtUserId = req.user?.id; // userId from JWT

    if (!doctorId || !appointmentDate) {
      return res.status(400).json({
        success: false,
        message: "Doctor ID and appointment date are required"
      });
    }

    // Find patient
    let patient = null;
    if (jwtPatientId) {
      patient = await Patient.findOne({ patientId: jwtPatientId });
    } else if (jwtUserId) {
      patient = await Patient.findOne({ userId: jwtUserId });
    }

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found"
      });
    }

    // Check doctor exists
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found"
      });
    }

    // Set doctorId if missing
    if (!patient.doctorId) {
      patient.doctorId = doctorId;
    }

    // Prepare appointment date
    const apptDateObj = new Date(appointmentDate);

    // Prevent duplicate appointment (same doctor, same date)
    const alreadyExists = patient.appointments.some(
      appt =>
        appt.doctorId.toString() === doctorId &&
        new Date(appt.appointmentDate).toDateString() === apptDateObj.toDateString()
    );
    if (alreadyExists) {
      return res.status(400).json({
        success: false,
        message: "Appointment already exists for this date and doctor"
      });
    }

    // Add appointment
    patient.appointments.push({
      doctorId,
      appointmentDate: apptDateObj,
      reason,
      status: "Scheduled"
    });

    // Save without triggering validation for unchanged fields
    await patient.save({ validateModifiedOnly: true });

    // Populate doctor info for the new appointment only
    await patient.populate({
      path: "appointments.doctorId",
      match: { _id: doctorId } // only populate the one we just added
    });

    const savedAppointment = patient.appointments[patient.appointments.length - 1];

    res.status(201).json({
      success: true,
      message: "Appointment created successfully",
      appointment: savedAppointment
    });

  } catch (error) {
    console.error("Error creating appointment:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


export const getFilteredPatients = async (req, res) => {
  try {
    const doctorId = req.doctor?.doctorId;
    if (!doctorId) {
      return res.status(401).json({ success: false, message: "Unauthorized access" });
    }

    const { search = "", status = "all", priority = "all", limit = 50, page = 1 } = req.query;

    // 🔹 Correctly create ObjectId using 'new'
    const andConditions = [{ doctorId: new mongoose.Types.ObjectId(doctorId) }];

    // 🔹 Search filter
    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      andConditions.push({
        $or: [
          { firstName: regex },
          { lastName: regex },
          { fullName: regex },
          { email: regex },
          { phone: regex }
        ]
      });
    }

    // 🔹 Status filter
    if (status.toLowerCase() !== "all") {
      andConditions.push({
        $or: [
          { status: status.trim() },
          { initialStatus: status.trim() }
        ]
      });
    }

    // 🔹 Priority filter
    if (priority.toLowerCase() !== "all") {
      andConditions.push({ priority: priority.trim() });
    }

    const filter = { $and: andConditions };
    console.log("🔎 MongoDB filter:", JSON.stringify(filter, null, 2));

    const patients = await Patient.find(filter)
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    console.log("🩺 Patients found:", patients.length);

    if (!patients.length) {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }

    res.json({ success: true, data: patients });
  } catch (error) {
    console.error("Error in getFilteredPatients:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
