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


const JWT_SECRET = process.env.JWT_SECRET;

// Create new patient
export const createPatient = async (req, res) => {
  try {
    const { fullName, patientId, password, dob, gender, phone, address } = req.body;

    if (!req.doctor?._id) {
      return res.status(401).json({ message: "Unauthorized: Doctor ID missing" });
    }

    const existing = await Patient.findOne({ patientId });
    if (existing) {
      return res.status(400).json({ message: "Patient with this ID already exists" });
    }

    const newPatient = new Patient({
      fullName,
      patientId,
      password,  // ✅ plain text here; schema will hash it
      dob,
      gender,
      phone,
      address,
      doctorId:req.doctor._id,
      createdBy: req.doctor._id,
    });

    await newPatient.save();

    res.status(201).json({ message: "Patient created successfully", patient: {
      _id: newPatient._id,
        fullName: newPatient.fullName,
        patientId: newPatient.patientId,
        doctorId: newPatient.doctorId,
        gender: newPatient.gender,
        phone: newPatient.phone,
        dob: newPatient.dob
    } });
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

export const getAllAppointments = async (req, res) => {
  try {
    const patientId = req.patient.patientId;

    const appointments = await Appointment.find({ patientId }).sort({ preferredDate: -1, preferredTime: -1 });

    res.status(200).json({
      success: true,
      message: 'Appointments fetched successfully',
      appointments
    });

  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};