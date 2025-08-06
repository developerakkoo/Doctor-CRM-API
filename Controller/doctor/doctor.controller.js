// doctor.controller.js (ES Module version)
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';


import Doctor from '../../Modals/doctor/Doctor.js';
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
        location,
        locationName
    } = req.body;

    try {
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const existingDoctor = await Doctor.findOne({ email });
        if (existingDoctor) {
            return res.status(400).json({ message: 'Doctor with this email already exists' });
        }

        const profile = req.file ? req.file.filename : null;

        let geoLocation = location;
        if (locationName) {
            const coordinates = await getCoordinates(locationName);
            if (!coordinates) {
                return res.status(400).json({ message: 'Invalid location name provided' });
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
            password: password.trim(), // Pre-save hook will hash it
            specialty,
            yearsOfExperience,
            phone,
            address,
            dob,
            age,
            location: geoLocation,
            profile
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
                email: newDoctor.email
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
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        console.log("Login request email:", email);
        console.log("Login request password:", password);

        const doctor = await Doctor.findOne({ email: email.trim() }).select('+password');

        if (!doctor) {
            return res.status(404).json({ message: 'Doctor not found' });
        }

        console.log("Doctor found. Stored hash:", doctor.password);

        const isPasswordValid = await bcrypt.compare(password.trim(), doctor.password);

        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid password' });
        }

        const token = jwt.sign(
            {
                doctorId: doctor._id, role: doctor.role
            },
            process.env.JWT_ACCESS_SECRET,
            { expiresIn: '1d' }
        );

        return res.status(200).json({ message: 'Login successful', token });

    } catch (error) {
        console.error('Login error:', error.message);
        return res.status(500).json({ message: 'Server error' });
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
            return res.status(404).json({ message: 'Doctor not found' });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const tokenExpiry = Date.now() + 1000 * 60 * 15; // valid for 15 minutes

        doctor.resetPasswordToken = resetToken;
        doctor.resetPasswordExpires = tokenExpiry;
        await doctor.save();

        // Construct reset link

        const resetLink = `http://localhost:5173/reset-password?token=${resetToken}`;

        // Send email (dummy function or actual SMTP)
        await sendEmail({
            to: doctor.email,
            subject: 'Password Reset',
            text: `Reset your password here: ${resetLink}`,
        });


        res.status(200).json({ message: 'Password reset link sent to email' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};



export const getDoctorById = async (req, res) => {
    const { id } = req.params;
    console.log("Received request to get doctor by ID:", id);

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
    const { token } = req.params;
    const { newPassword } = req.body;

    try {
        // Find doctor by token and ensure it's not expired
        const doctor = await Doctor.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        }).select('+password'); // Include password field (was excluded by default)

        if (!doctor) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Set new password and clear reset token fields
        doctor.password = hashedPassword;
        doctor.resetPasswordToken = undefined;
        doctor.resetPasswordExpires = undefined;

        await doctor.save();

        return res.status(200).json({ message: 'Password has been reset successfully' });

    } catch (error) {
        console.error(' Error resetting password:', error);
        return res.status(500).json({ message: 'Server error' });
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

        // ✅ Push video directly using update operator to avoid full doc validation
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

        console.log("Doctor ID:", doctor._id);
        console.log("Doctor Videos:", doctor.videos.map(v => v._id.toString()));
        console.log("Requested Video ID:", videoId);

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
    const doctorId = req.doctor.doctorId; // from JWT

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1); // Start of tomorrow

    // ✅ Fixed date comparison logic
    const appointments = await Appointment.find({
      doctorId,
      appointmentDate: {
        $gte: today,
        $lt: tomorrow
      }
    })
      .populate('patientId', 'name age gender') // Optional: add more fields if needed
      .sort({ appointmentTime: 1 }); // Sort by time

    res.status(200).json({ appointments });
  } catch (error) {
    console.error("Error fetching today's appointments:", error);
    res.status(500).json({ message: "Server Error" });
  }
};


export const createAppointment = async (req, res) => {
  try {
    const { patientId, doctorId, appointmentDate, appointmentTime, notes } = req.body;

    // ✅ Validation for required fields
    if (!patientId || !doctorId || !appointmentDate || !appointmentTime) {
      return res.status(400).json({ message: 'All required fields must be filled' });
    }

    // ✅ Confirm patient and doctor exist
    const patient = await Patient.findById(patientId);
    const doctor = await Doctor.findById(doctorId);

    if (!patient || !doctor) {
      return res.status(404).json({ message: 'Doctor or patient not found' });
    }

    // ✅ Convert string date to JS Date object
    const newAppointment = new Appointment({
      patientId,
      doctorId,
      appointmentDate: new Date(appointmentDate),
      appointmentTime,
      status: 'Scheduled',
      notes: notes || ''
    });

    await newAppointment.save();

    res.status(201).json({
      message: 'Appointment created successfully',
      appointment: newAppointment
    });
  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({ message: 'Internal Server Error', error });
  }
};
