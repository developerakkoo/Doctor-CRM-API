import dotenv from 'dotenv';
dotenv.config();

import jwt from 'jsonwebtoken';
import Doctor from '../Modals/doctor/doctor.js';

import Patient from '../Modals/patient/patient.js';
import mongoose from 'mongoose';
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('JWT_SECRET is not defined in .env');
}

export const verifyAccess = (allowedRoles = []) => async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : req.query.token;

    if (!token) {
      return res.status(401).json({ success: false, message: "Unauthorized: No token provided" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    console.log("✅ JWT decoded:", decoded);

    const role = decoded.role?.toLowerCase();
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ success: false, message: "Forbidden: Insufficient permissions" });
    }

    // Attach role-specific objects
    if (role === "doctor") {
      if (!decoded.doctorId) 
        return res.status(400).json({ success: false, message: "doctorId missing in token" });

      const doctor = await Doctor.findById(decoded.doctorId).select("-password");
      if (!doctor) 
        return res.status(404).json({ success: false, message: "Doctor not found" });

      // Ensure doctorId is always string for filtering
      req.doctor = { ...doctor.toObject(), doctorId: doctor._id.toString() };
      console.log("👨‍⚕️ Doctor attached to req:", req.doctor);
    } 
    else if (role === "patient") {
      if (!decoded.patientId) 
        return res.status(400).json({ success: false, message: "patientId missing in token" });

      const patient = await Patient.findOne({ patientId: decoded.patientId }).select("-password");
      if (!patient) 
        return res.status(404).json({ success: false, message: "Patient not found" });

      req.patient = patient;
      console.log("🧑 Patient attached to req:", req.patient);
    }

    next();
  } catch (err) {
    console.error("❌ JWT verification failed:", err.message);
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};