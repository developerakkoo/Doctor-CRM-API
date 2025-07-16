import dotenv from 'dotenv';
dotenv.config();

import jwt from 'jsonwebtoken';
import Doctor from '../Modals/doctor/Doctor.js';
import Patient from '../Modals/patient/patient.js';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('JWT_SECRET is not defined in .env');
}

export const verifyAccess = (allowedRoles) => async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log("Decoded JWT:", decoded);

    req.user = decoded; 
    
    if (!allowedRoles.includes(decoded.role)) {
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
    }

    // Use _id if it's stored in token
    if (decoded.role === 'doctor' || decoded.role === 'Doctor') {
      const doctor = await Doctor.findById(decoded.doctorId);
      if (!doctor) {
        return res.status(404).json({ message: 'Doctor not found' });
      }
      req.doctor = doctor;
    } else if (decoded.role === 'patient' || decoded.role === 'Patient') {
      const patient = await Patient.findOne({ patientId: decoded.patientId });
      if (!patient) {
        return res.status(404).json({ message: 'Patient not found' });
      }
      req.patient = patient;
    }
    else if (decoded.role === 'medicalOwner') {
      const owner = await MedicalOwner.findById(decoded.ownerId);
      if (!owner) {
        return res.status(404).json({ message: 'Medical Owner not found' });
      }
      req.medicalOwner = owner;
    }

    next();
  } catch (err) {
    console.error('JWT verification failed:', err.message);
    return res.status(401).json({ message: 'Invalid token' });
  }
};
