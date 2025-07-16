import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

export const verifyPatient = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.role !== 'patient') {
      return res.status(403).json({ message: 'Forbidden: Not a patient' });
    }

    req.patient = decoded; // Contains patientId and role
    next();
  } catch (err) {
    console.error('Token verification failed:', err.message);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
