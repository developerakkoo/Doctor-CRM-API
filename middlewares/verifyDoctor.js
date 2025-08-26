import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

export const verifyDoctor = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== 'doctor') {
      return res.status(403).json({ message: "Access denied: Not a doctor" });
    }

    req.doctor = {
      doctorId: decoded.doctorId,
      _id: decoded._id || decoded.id || decoded.doctorId,
    };

    next();
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};