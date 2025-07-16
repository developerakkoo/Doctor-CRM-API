import jwt from 'jsonwebtoken';
import Doctor from '../Modals/doctor/Doctor.js';

export const verifyDoctorToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer '))
      return res.status(401).json({ message: 'Unauthorized' });

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== 'doctor')
      return res.status(403).json({ message: 'Access denied: Not a doctor' });

    const doctor = await Doctor.findById(decoded.doctorId);
    if (!doctor)
      return res.status(404).json({ message: 'Doctor not found' });

    req.doctor = doctor;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
