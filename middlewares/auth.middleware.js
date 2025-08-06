import dotenv from 'dotenv';
dotenv.config();

import jwt from 'jsonwebtoken';
import Doctor from '../Modals/doctor/Doctor.js';
import Patient from '../Modals/patient/patient.js';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('JWT_SECRET is not defined in .env');
}
export const verifyAccess = (allowedRoles = []) => async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") 
    ? authHeader.split(" ")[1] 
    : req.query.token;

  if (!token) {
    console.warn("🔒 No token provided");
    return res.status(401).json({ success: false, message: "Unauthorized: No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("✅ JWT decoded:", decoded);
    req.user = decoded;

    const role = decoded.role?.toLowerCase();

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ success: false, message: "Forbidden: Insufficient permissions" });
    }

    // Role-specific data attachment
    if (role === "doctor") {
      if (!decoded.doctorId) {
        return res.status(400).json({ success: false, message: "doctorId missing in token" });
      }
      const doctor = await Doctor.findById(decoded.doctorId).select("-password");
      if (!doctor) {
        return res.status(404).json({ success: false, message: "Doctor not found" });
      }
      req.doctor = doctor;
    }

    else if (role === "patient") {
      if (!decoded.patientId) {
        return res.status(400).json({ success: false, message: "patientId missing in token" });
      }
      const patient = await Patient.findOne({ patientId: decoded.patientId }).select("-password");
      if (!patient) {
        return res.status(404).json({ success: false, message: "Patient not found" });
      }
      req.patient = patient;
    }

    else if (role === "medicalowner") {
      if (!decoded.ownerId) {
        return res.status(400).json({ success: false, message: "ownerId missing in token" });
      }
      const owner = await MedicalOwner.findById(decoded.ownerId).select("-password");
      if (!owner) {
        return res.status(404).json({ success: false, message: "Medical Owner not found" });
      }
      req.medicalOwner = owner;
    }

    next();
  } catch (err) {
    console.error("❌ JWT verification failed:", err.message);
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};