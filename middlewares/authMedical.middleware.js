// middlewares/authMedicalOwner.middleware.js
import jwt from 'jsonwebtoken';
import MedicalOwner from '../Modals/medicalOwner/medicalOwner.js';

export const verifyMedicalOwner = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role !== 'medicalOwner') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const owner = await MedicalOwner.findById(decoded.ownerId).select('-password -totpSecret');
    if (!owner) return res.status(404).json({ message: 'Medical Owner not found' });

    req.medicalOwner = owner;
    
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token', error: err.message });
  }
};
