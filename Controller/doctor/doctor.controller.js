// doctor.controller.js (ES Module version)
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';


import Doctor from '../../Modals/doctor/doctor.js';
import fs from 'fs';
import path from 'path';


import crypto from 'crypto';
import axios from 'axios';

import mongoose from 'mongoose';
import { getCoordinates } from '../../utils/getCoordinates.js';

import Patient from '../../Modals/patient/patient.js';
import Appointment from '../../Modals/patient/appointment.js';
import moment from 'moment';

import { fileURLToPath } from 'url';
import { dirname } from 'path';

import nodemailer from "nodemailer";
import sendEmail from '../../utils/sendEmail.js';
import Counter from '../../Modals/patient/counter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;  
const JWT_SECRET = process.env.JWT_SECRET || 'fallbackSecret';


export const getAllDoctors = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      specialty,
      location,
      sortBy = 'yearsOfExperience',
      sortOrder = 'desc',
      search,
      minExperience
    } = req.query;

    const pageInt = parseInt(page);
    const limitInt = parseInt(limit);

    const filter = {};
    if (specialty) {
      filter.specialty = { $regex: specialty, $options: 'i' };
    }
    if (location) {
      filter.location = { $regex: location, $options: 'i' };
    }
    if (minExperience) {
      filter.yearsOfExperience = { $gte: parseInt(minExperience) };
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const sortOptions = {};
    const validSortFields = ['name', 'email', 'age', 'yearsOfExperience', 'dob'];
    sortOptions[sortBy] = validSortFields.includes(sortBy) ? (sortOrder === 'asc' ? 1 : -1) : -1;

    const skip = (pageInt - 1) * limitInt;
    const doctors = await Doctor.find(filter).sort(sortOptions).skip(skip).limit(limitInt);
    const total = await Doctor.countDocuments(filter);

    res.status(200).json({
      success: true,
      total,
      page: pageInt,
      pages: Math.ceil(total / limitInt),
      filtersApplied: { specialty, location, search, sortBy, sortOrder, minExperience },
      data: doctors
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching doctors', error });
  }
};


export const addDoctor = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      specialty,
      yearsOfExperience,
      phone,
      address,
      dob,
      age,
      locationName,
      title,
      professionalBio
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const existingDoctor = await Doctor.findOne({ email });
    if (existingDoctor) {
      return res.status(400).json({ message: 'Doctor with this email already exists' });
    }

    let geoLocation;
    if (locationName) {
      const coordinates = await getCoordinates(locationName);
      if (!coordinates) {
        return res.status(400).json({ message: 'Invalid location name' });
      }

      geoLocation = {
        type: 'Point',
        coordinates: [coordinates.longitude, coordinates.latitude],
        locationName
      };
    }

    const newDoctor = new Doctor({
      name,
      email,
      password,
      specialty,
      yearsOfExperience,
      phone,
      address,
      dob,
      age,
      title,
      professionalBio,
      location: geoLocation
    });

    await newDoctor.save();

    const token = jwt.sign(
      { doctorId: newDoctor._id, role: newDoctor.role },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '2h' }
    );

    return res.status(201).json({
      message: 'Doctor registered successfully',
      token,
      doctor: {
        id: newDoctor._id,
        name: newDoctor.name,
        email: newDoctor.email,
        role: newDoctor.role,
        title: newDoctor.title,
        professionalBio: newDoctor.professionalBio,
        licenseNumber: newDoctor.licenseNumber // ✅ Ensures it's in response
      }
    });

  } catch (error) {
    console.error('Error registering doctor:', error.message);
    return res.status(500).json({ message: 'Error adding doctor', error: error.message });
  }
};




export const updateDoctor = async (req, res) => {
  const { id } = req.params;
  const body = req.body || {};
  const { name, specialty, yearsOfExperience } = body;
  const newProfile = req.file ? req.file.filename : null;

  try {
    const updateData = { ...req.body };
    if (req.file) {
      updateData.profile = `/uploads/doctors/${req.file.filename}`;
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid doctor ID format' });
    }

    const doctor = await Doctor.findById(id);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    if (newProfile && doctor.profile) {
      const oldPath = path.join(__dirname, '../../uploads', doctor.profile);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    doctor.name = name || doctor.name;
    doctor.specialty = specialty || doctor.specialty;
    doctor.yearsOfExperience = yearsOfExperience || doctor.yearsOfExperience;
    if (newProfile) doctor.profile = newProfile;

    await doctor.save();

    const updatedDoctor = await Doctor.findByIdAndUpdate(id, updateData, { new: true });
    if (!updatedDoctor) return res.status(404).json({ message: "Doctor not found" });

    res.status(200).json({ message: 'Doctor updated successfully', data: doctor });

  } catch (error) {
    console.error('Error updating doctor:', error);
    res.status(500).json({ message: 'Error updating doctor', error: error.message });
  }
};

export const deleteDoctor = async (req, res) => {
  const { id } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid doctor ID format' });
    }

    const deletedDoctor = await Doctor.findByIdAndDelete(id);
    if (!deletedDoctor) return res.status(404).json({ message: 'Doctor not found' });

    if (deletedDoctor.profile) {
      const filePath = path.join(__dirname, '../../uploads', deletedDoctor.profile);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    res.status(200).json({ message: 'Doctor deleted successfully' });

  } catch (error) {
    console.error('Error deleting doctor:', error);
    res.status(500).json({ message: 'Error deleting doctor', error: error.message });
  }
};

export const uploadDegreePhoto = async (req, res) => {
  try {
    const doctorId = req.params.id;
    const file = req.file;

    if (!file) return res.status(400).json({ message: 'No file uploaded' });

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

    doctor.degreePhoto = {
      data: file.buffer,
      contentType: file.mimetype
    };

    await doctor.save();

    res.status(200).json({ message: 'Degree photo uploaded successfully' });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Failed to upload degree photo', error: error.message });
  }
};

export const loginDoctor = async (req, res) => {
  const { email, password } = req.body;

  try {
    const doctor = await Doctor.findOne({ email });
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    // ✅ Ensure doctor has a password set
    if (!doctor.password) {
      return res.status(400).json({
        message: "Doctor has no password set. Please reset your password.",
      });
    }

    // ✅ Compare entered password with stored hash
    const isMatch = await bcrypt.compare(password, doctor.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // ✅ Generate JWT Token
    const token = jwt.sign(
      { doctorId: doctor._id, role: "doctor" },
      process.env.JWT_SECRET, 
      { expiresIn: "1h" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      doctor: {
        id: doctor._id,
        name: doctor.name,
        email: doctor.email,
      },
    });
  } catch (error) {
    console.error("Error in loginDoctor:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const changePassword = async (req, res) => {
  const doctorId = req.user?.doctorId;
  const { currentPassword } = req.body;

  try {
    const doctor = await Doctor.findById(doctorId).select('+password email name');
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

    const isMatch = await bcrypt.compare(currentPassword.trim(), doctor.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // ✅ Generate a one-time password change token (expires in 15 mins)
    const token = jwt.sign(
      { doctorId: doctor._id, email: doctor.email },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    const link = `http://localhost:5173/reset-password?token=${token}`;

    await sendEmail({
      to: doctor.email,
      subject: 'Change Your Password - Doctor CRM',
      text: `Hi Dr. ${doctor.name},\n\nClick the link below to set your new password:\n\n${link}\n\nNote: This link is valid for 15 minutes.\n\n– Doctor CRM`
    });

    res.status(200).json({ message: 'Password reset link sent to your email.' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Failed to initiate password change', error: error.message });
  }
};

export const confirmChangePassword = async (req, res) => {
  const { token } = req.query;
  const { newPassword } = req.body;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const doctor = await Doctor.findById(decoded.doctorId).select('+password');

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    doctor.set('password', newPassword.trim());
    await doctor.save();

    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Password confirm error:', error);
    res.status(400).json({ message: 'Invalid or expired token' });
  }
};


export const requestPasswordReset = async (req, res) => {
  const { email } = req.body;

  try {
    const doctor = await Doctor.findOne({ email });
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    // ✅ Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // ✅ Save OTP in DB
    doctor.resetOtp = otp;
    doctor.resetOtpExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes

    await doctor.save();

    // ✅ Send OTP via Email
    await sendEmail({
      to: email,
      subject: "Doctor CRM - Password Reset OTP",
      text: `Your OTP for password reset is: ${otp}. It is valid for 15 minutes.`
    });

    res.status(200).json({
      message: "Password reset OTP sent to your email",
    });
  } catch (error) {
    console.error("Error in requestPasswordReset:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


export const getDoctorById = async (req, res) => {
  const { id } = req.params;
  // console.log("Received request to get doctor by ID:", id);

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.warn("Invalid doctor ID format");
      return res.status(400).json({
        success: false,
        message: "Invalid doctor ID format",
      });
    }

    const doctor = await Doctor.findById(id).select("-password");
    if (!doctor) {
      console.warn("Doctor not found with ID:", id);
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Doctor retrieved successfully",
      data: doctor,
    });
  } catch (error) {
    console.error("Error fetching doctor by ID:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching doctor",
      error: error.message,
    });
  }
};


export const resetDoctorPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    const doctor = await Doctor.findOne({ email });
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    // 🔍 Debug logs
    // console.log("Stored OTP:", doctor.resetOtp);
    // console.log("Received OTP:", otp);
    // console.log("Expiry:", doctor.resetOtpExpiry, "Now:", Date.now());

    // ✅ Check OTP with string conversion
    if (
      String(doctor.resetOtp) !== String(otp) ||
      !doctor.resetOtpExpiry ||
      doctor.resetOtpExpiry < Date.now()
    ) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // ✅ Update password (hook will hash)
    doctor.password = newPassword;

    // ✅ Clear reset fields
    doctor.resetOtp = undefined;
    doctor.resetOtpExpiry = undefined;

    await doctor.save();

    res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Error in resetDoctorPassword:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};




export const logoutDoctor = async (req, res) => {
  try {
    // If using cookies, clear it (optional depending on frontend strategy)
    res.clearCookie('token');

    // Just tell frontend to remove the token (JWTs are stateless)
    return res.status(200).json({
      success: true,
      message: "Logged out successfully."
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Logout failed.",
      error: error.message
    });
  }
};

export const getDoctorPatients = async (req, res) => {
  try {
    const doctorId = req.doctor._id;

    const patients = await Patient.find({ doctorId }).select('-password -__v');

    res.status(200).json({
      message: 'Patients retrieved successfully',
      count: patients.length,
      patients
    });
  } catch (err) {
    console.error('Get Doctor Patients Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getPatientDetails = async (req, res) => {
  try {
    const { patientId } = req.params;

    const patient = await Patient.findOne({ patientId })
      .select("-password -__v") // Exclude sensitive fields
      .populate("reports") // Only if reports are in another collection
      .populate("prescriptions"); // Only if prescriptions are referenced

    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    res.status(200).json({ message: "Patient details fetched", data: patient });
  } catch (error) {
    console.error("Error fetching patient details:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getPatientCounts = async (req, res) => {
  try {
    const doctorId = req.doctor._id;

    const now = new Date();
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(now.getDate() - 7);

    const oneMonthAgo = new Date(now);
    oneMonthAgo.setDate(now.getDate() - 30);

    const ninetyDaysAgo = new Date(now);
    ninetyDaysAgo.setDate(now.getDate() - 90);

    const totalPatients = await Patient.countDocuments({ createdBy: doctorId });

    const weeklyPatients = await Patient.countDocuments({
      createdBy: doctorId,
      createdAt: { $gte: oneWeekAgo },
    });

    const monthlyPatients = await Patient.countDocuments({
      createdBy: doctorId,
      createdAt: { $gte: oneMonthAgo },
    });

    const nonReturningPatients = await Patient.countDocuments({
      createdBy: doctorId,
      $and: [
        {
          $or: [
            { "prescriptions.date": { $lt: ninetyDaysAgo } },
            { prescriptions: { $exists: false } },
            { prescriptions: { $size: 0 } },
          ],
        },
        {
          $or: [
            { "reports.date": { $lt: ninetyDaysAgo } },
            { reports: { $exists: false } },
            { reports: { $size: 0 } },
          ],
        },
      ],
    });

    res.status(200).json({
      totalPatients,
      monthlyPatients,
      weeklyPatients,
      nonReturningPatients,
    });
  } catch (error) {
    console.error("Error in dashboard patient counts:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // or JWT_SECRET
    const doctor = await Doctor.findById(decoded.doctorId).select('+password');

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    doctor.password = newPassword.trim();  // ✅ Let pre-save hook hash it
    await doctor.save();

    return res.status(200).json({ message: 'Password has been reset successfully.' });

  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(400).json({ message: 'Invalid or expired token.' });
  }
};

export const uploadDoctorVideo = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { context, title } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'No video uploaded' });
    }

    const normalizedPath = path.normalize(req.file.path);

    // Validate patient existence
    const patient = await Patient.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const videoMeta = {
      title: title || `Doctor Video - ${context}`,
      videoUrl: normalizedPath,
      uploadedBy: req.doctor._id,
      uploadedAt: new Date(),
      context,
    };

    //  Push video directly using update operator to avoid full doc validation
    await Patient.updateOne(
      { patientId },
      { $push: { videos: videoMeta } }
    );

    // Doctor video update
    const doctor = await Doctor.findById(req.doctor._id);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    doctor.videos = doctor.videos || [];
    doctor.videos.push({
      title: videoMeta.title,
      videoUrl: videoMeta.videoUrl,
      context: videoMeta.context,
      uploadedAt: videoMeta.uploadedAt,
    });
    await doctor.save();

    res.status(200).json({
      message: 'Video uploaded successfully',
      video: videoMeta,
    });

  } catch (err) {
    console.error('Upload Error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const getDoctorVideos = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.doctor._id);

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    res.status(200).json(doctor.videos || []);
  } catch (err) {
    console.error('Fetch Videos Error:', err);
    res.status(500).json({ error: 'Failed to fetch videos', details: err.message });
  }
};

export const streamDoctorVideo = async (req, res) => {
  try {
    const { videoId } = req.params;

    const doctor = req.doctor;
    if (!doctor) return res.status(401).json({ message: 'Doctor not authenticated' });

    // console.log("Doctor ID:", doctor._id);
    // console.log("Doctor Videos:", doctor.videos.map(v => v._id.toString()));
    // console.log("Requested Video ID:", videoId);

    const video = doctor.videos.find(v => v._id.toString() === videoId);
    if (!video) return res.status(404).json({ message: 'Video not found' });

    const videoPath = path.resolve(video.videoUrl);
    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({ message: 'Video file not found on server' });
    }

    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (!range) {
      return res.status(400).send("Requires Range header");
    }

    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    const contentLength = end - start + 1;
    const headers = {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": contentLength,
      "Content-Type": "video/mp4",
    };

    res.writeHead(206, headers);
    const videoStream = fs.createReadStream(videoPath, { start, end });
    videoStream.pipe(res);
  } catch (err) {
    console.error("Stream Error:", err);
    res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
};

export const getTodaysAppointments = async (req, res) => {
  try {
    const doctorId = req.doctor?._id;
    if (!doctorId) {
      return res.status(401).json({ message: "Unauthorized access" });
    }

    // Get today's date at midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 00:00:00

    // Get tomorrow's date at midnight
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const appointments = await Appointment.find({
      doctorId,
      appointmentDate: {
        $gte: today,
        $lt: tomorrow
      }
    })
      .populate('patientId', 'name age gender') // optional: add more fields if needed
      .sort({ appointmentTime: 1 });

    res.status(200).json({ appointments });
  } catch (error) {
    console.error("Error fetching today's appointments:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

export const createAppointment = async (req, res) => {
  try {
    const doctorId = req.doctor?.doctorId; // ✅ from verifyAccess middleware for doctors
    if (!doctorId) {
      return res.status(401).json({ message: 'Unauthorized: Doctor not found in token' });
    }

    const {
      name,
      email,
      phone,
      appointmentType,
      duration,
      appointmentDate,
      appointmentTime,
      location,
      notes
    } = req.body;

    // ✅ Validate required fields
    if (!name || !email || !phone || !appointmentType || !duration || !appointmentDate || !appointmentTime) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    // ✅ Step 1: Find patient by email
    const patient = await Patient.findOne({ email });

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found with this email' });
    }

    // ✅ Step 2: Create appointment and link patientId
    const newAppointment = new Appointment({
      doctorId,
      patientId: patient._id,
      name,
      email,
      phone,
      appointmentType,
      duration,
      appointmentDate,
      appointmentTime,
      location,
      notes
    });

    await newAppointment.save();

    // ✅ Step 3: Push appointment summary into Patient's embedded appointments array
    await Patient.findByIdAndUpdate(
      patient._id,
      {
        $push: {
          appointments: {
            appointmentDate,
            reason: appointmentType,
            doctorId,
            status: 'Scheduled',
            notes
          }
        }
      }
    );

    res.status(201).json({
      message: 'Appointment created and linked to patient successfully',
      appointment: newAppointment
    });

  } catch (error) {
    console.error('Error creating doctor appointment:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


export const editAppointment = async (req, res) => {
  try {
    const doctorId = req.doctor?.doctorId; // from token middleware
    const appointmentId = req.params.id;

    if (!doctorId) {
      return res.status(401).json({ message: 'Unauthorized: Doctor not found in token' });
    }

    const existingAppointment = await Appointment.findById(appointmentId);

    if (!existingAppointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check if this doctor owns the appointment
    if (existingAppointment.doctorId.toString() !== doctorId) {
      return res.status(403).json({ message: 'Forbidden: Not your appointment' });
    }

    // ✅ Fields allowed to be updated
    const updatableFields = [
      'name',
      'email',
      'phone',
      'appointmentType',
      'duration',
      'appointmentDate',
      'appointmentTime',
      'location',
      'notes'
    ];

    // Update only fields provided in the request
    updatableFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        existingAppointment[field] = req.body[field];
      }
    });

    await existingAppointment.save();

    res.status(200).json({
      message: 'Appointment updated successfully',
      appointment: existingAppointment
    });

  } catch (error) {
    console.error('Error updating appointment:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};




export const getUpcomingAppointmentsForDoctor = async (req, res) => {
  try {
    const doctorIdFromJWT = req.doctor?.doctorId || req.doctor?._id;

    if (!doctorIdFromJWT) {
      return res.status(401).json({ success: false, message: "Unauthorized access" });
    }

    let doctor;
    if (mongoose.Types.ObjectId.isValid(doctorIdFromJWT)) {
      doctor = await Doctor.findById(doctorIdFromJWT);
    }

    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    // Get today's date at midnight
    const now = moment().startOf("day").toDate();

    // Fetch patients who have appointments with this doctor from today onwards
    const patients = await Patient.find({
      "appointments.doctorId": doctor._id,
      "appointments.appointmentDate": { $gte: now }
    });

    const upcomingAppointments = [];

    patients.forEach(patient => {
      patient.appointments.forEach(appt => {
        if (
          appt.doctorId?.toString() === doctor._id.toString() &&
          new Date(appt.appointmentDate) >= now
        ) {
          upcomingAppointments.push({
            patientId: patient._id,
            patientName: `${patient.firstName} ${patient.lastName}`,
            appointmentDate: appt.appointmentDate,
            appointmentTime: appt.appointmentTime, // <-- added time
            reason: appt.reason || 'N/A',
            status: appt.status,
            doctorId: doctor._id,
            doctorName: doctor.name || "Unknown"
          });
        }
      });
    });

    // Sort by date and time
    upcomingAppointments.sort((a, b) => {
      const dateA = new Date(`${a.appointmentDate} ${a.appointmentTime}`);
      const dateB = new Date(`${b.appointmentDate} ${b.appointmentTime}`);
      return dateA - dateB;
    });

    res.status(200).json({
      success: true,
      count: upcomingAppointments.length,
      appointments: upcomingAppointments
    });

  } catch (error) {
    console.error("Error fetching upcoming appointments for doctor:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


export const getFilteredAppointments = async (req, res) => {
  try {
    const { dateFilter = "all", status = "all" } = req.query;
    let dateQuery = {};

    const today = moment().startOf("day");

    // Date filter handling
    if (dateFilter === "today") {
      dateQuery.date = { $gte: today.toDate(), $lt: moment(today).endOf("day").toDate() };
    } else if (dateFilter === "week") {
      dateQuery.date = { $gte: today.toDate(), $lt: moment(today).add(7, "days").endOf("day").toDate() };
    } else if (dateFilter === "month") {
      dateQuery.date = { $gte: today.toDate(), $lt: moment(today).add(1, "month").endOf("day").toDate() };
    }
    // "all" → no date filter

    // Status filter handling
    let statusQuery = {};
    if (status !== "all") {
      statusQuery.status = status;
    }

    // Combine filters
    const appointments = await Appointment.find({
      ...dateQuery,
      ...statusQuery,
    })
      .populate("patientId")
      .populate("doctorId")
      .sort({ date: 1, time: 1 });

    res.status(200).json({ success: true, data: appointments });
  } catch (error) {
    console.error("Error fetching filtered appointments:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
export const getRecentPatientsForDoctor = async (req, res) => {
  try {
    if (!req.doctor?._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const recentPatients = await Patient.find({ doctorId: req.doctor._id })
      .sort({ createdAt: -1 })
      .limit(5) // last 5 patients
      .select("patientId firstName lastName email phone createdAt initialStatus priority source");

    res.status(200).json({
      success: true,
      recentPatients
    });
  } catch (err) {
    console.error("Get Recent Patients Error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/v1/doctors/patients/stats
export const getPatientsStats = async (req, res) => {
  try {
    const doctorId = req.doctor?.doctorId || req.user?.doctorId;
    if (!doctorId) {
      return res.status(401).json({ success: false, message: "Unauthorized access" });
    }

    const now = new Date();
    const startOfToday = new Date(now.setHours(0, 0, 0, 0));

    // Total patients for doctor
    const totalCount = await Patient.countDocuments({ doctorId });

    // New patients today
    const newCount = await Patient.countDocuments({
      doctorId,
      createdAt: { $gte: startOfToday },
    });

    // Contacted patients
    const contactedCount = await Patient.countDocuments({
      doctorId,
      $or: [
        { status: "contact" },
        { initialStatus: "contact" }
      ]
    });

    // Qualified patients
    const qualifiedCount = await Patient.countDocuments({
      doctorId,
      $or: [
        { status: "qualified" },
        { initialStatus: "qualified" }
      ]
    });

    // Converted patients
    const convertedCount = await Patient.countDocuments({
      doctorId,
      $or: [
        { status: "converted" },
        { initialStatus: "converted" }
      ]
    });

    res.json({
      success: true,
      data: {
        total: totalCount,
        new: newCount,
        contacted: contactedCount,
        qualified: qualifiedCount,
        converted: convertedCount,
      },
    });
  } catch (error) {
    console.error("Error in getPatientsStats:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getWeeklyPatientCount = async (req, res) => {
  try {
    const doctorId = req.doctor.doctorId; // from JWT

    // Get start and end of the current week (Mon-Sun)
    const startOfWeek = moment().startOf('week').toDate();
    const endOfWeek = moment().endOf('week').toDate();

    const count = await Patient.countDocuments({
      createdBy: doctorId, // ensure patient was added by this doctor
      createdAt: { $gte: startOfWeek, $lte: endOfWeek }
    });

    res.status(200).json({
      message: 'Weekly patient count fetched successfully',
      doctorId,
      week: { start: startOfWeek, end: endOfWeek },
      count
    });
  } catch (error) {
    console.error('Error fetching weekly patient count:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updatePatientByDoctor = async (req, res) => {
  try {
    const { patientId } = req.params;

    // Ensure doctor is logged in
    const doctorId = req.doctor?.doctorId; // comes from JWT via verifyAccess
    if (!doctorId) {
      return res.status(403).json({ message: "Doctor authentication required" });
    }

    // Find patient
    const patient = await Patient.findOne({ patientId: patientId });
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // (Optional) Ensure doctor can only update patients created/linked by him
    if (String(patient.doctorId) !== String(doctorId)) {
      return res.status(403).json({ message: "Unauthorized: not your patient" });
    }

    // Update all allowed fields from body
    Object.assign(patient, req.body);

    await patient.save();

    res.status(200).json({
      message: "Patient profile updated successfully",
      data: patient
    });
  } catch (error) {
    console.error("Error updating patient profile by doctor:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getPatientOverviewStats = async (req, res) => {
  try {
    const doctorId = req.doctor?.doctorId; // from JWT after login

    if (!doctorId) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Count current month patients
    const currentMonthCount = await Patient.countDocuments({
      doctorId,
      createdAt: { $gte: currentMonthStart }
    });

    // Count last month patients
    const lastMonthCount = await Patient.countDocuments({
      doctorId,
      createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd }
    });

    // Calculate % change
    let percentageChange = 0;
    if (lastMonthCount > 0) {
      percentageChange = ((currentMonthCount - lastMonthCount) / lastMonthCount) * 100;
    }

    res.status(200).json({
      success: true,
      data: {
        totalPatients: currentMonthCount,
        percentageChange: Number(percentageChange.toFixed(2)),
        text: `${percentageChange >= 0 ? "+" : ""}${percentageChange.toFixed(2)}% from last month`
      }
    });

  } catch (error) {
    console.error("Error fetching patient stats:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

export const getPatientWeeklyStats = async (req, res) => {
  try {
    const doctorId = req.doctor?.doctorId; // attached in middleware

    if (!doctorId) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const now = new Date();

    // Current week start (Sunday)
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(now.getDate() - now.getDay());
    currentWeekStart.setHours(0, 0, 0, 0);

    // Last week range
    const lastWeekStart = new Date(currentWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    const lastWeekEnd = new Date(currentWeekStart);
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);

    // Count patients this week
    const currentWeekCount = await Patient.countDocuments({
      doctorId,
      createdAt: { $gte: currentWeekStart }
    });

    // Count patients last week
    const lastWeekCount = await Patient.countDocuments({
      doctorId,
      createdAt: { $gte: lastWeekStart, $lte: lastWeekEnd }
    });

    // Calculate percentage change
    let weeklyChange = 0;
    if (lastWeekCount > 0) {
      weeklyChange = ((currentWeekCount - lastWeekCount) / lastWeekCount) * 100;
    }

    res.status(200).json({
      success: true,
      data: {
        newPatients: currentWeekCount,
        percentageChange: Number(weeklyChange.toFixed(2)),
        text: `${weeklyChange >= 0 ? "+" : ""}${weeklyChange.toFixed(2)}% vs last week`
      }
    });

  } catch (error) {
    console.error("Error fetching weekly patient stats:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

export const sendAppointmentEmail = async (req, res) => {
  try {
    const doctorId = req.doctor?.doctorId;

    if (!doctorId) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Doctor not found in token' });
    }

    // ✅ Fetch the latest appointment created by this doctor
    const latestAppointment = await Appointment.findOne({ doctorId })
      .sort({ createdAt: -1 })
      .lean();

    if (!latestAppointment) {
      return res.status(404).json({ success: false, message: 'No appointment found for this doctor' });
    }

    const patientId = latestAppointment.patientId;

    if (!patientId) {
      return res.status(400).json({ success: false, message: 'Patient ID missing in appointment' });
    }

    const [doctor, patient] = await Promise.all([
      Doctor.findById(doctorId).lean(),
      Patient.findById(patientId).lean(),
    ]);

    if (!doctor || !patient) {
      return res.status(404).json({ success: false, message: 'Doctor or patient not found' });
    }

    // ✅ Configure transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // ✅ Compose email
    const mailOptions = {
      from: `"${doctor.name}" <${process.env.EMAIL_USER}>`,
      to: patient.email,
      subject: '📅 Appointment Confirmation',
      html: `
        <h3>Hello ${patient.firstName},</h3>
        <p>Your appointment has been confirmed.</p>
        <ul>
          <li><strong>Date:</strong> ${new Date(latestAppointment.appointmentDate).toDateString()}</li>
          <li><strong>Time:</strong> ${latestAppointment.appointmentTime}</li>
          <li><strong>Doctor:</strong> Dr. ${doctor.name}</li>
          <li><strong>Location:</strong> ${latestAppointment.location || 'Clinic'}</li>
        </ul>
        <p>Please be on time and bring any prior reports if available.</p>
        <br>
        <p>Thank you,<br/>Dr. ${doctor.name}</p>
      `
    };

    // ✅ Send email
    await transporter.sendMail(mailOptions);

    res.status(200).json({
      success: true,
      message: 'Appointment email sent to patient successfully',
      emailSentTo: patient.email,
      appointmentId: latestAppointment._id
    });

  } catch (error) {
    console.error('❌ Error sending appointment email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send appointment email',
      error: error.message
    });
  }
};