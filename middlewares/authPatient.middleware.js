import dotenv from 'dotenv';
dotenv.config();

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;

if (!JWT_SECRET || !JWT_ACCESS_SECRET) {
  console.error('❌ JWT_SECRET or JWT_ACCESS_SECRET is missing in .env');
}

export const verifyAccess = (roles = []) => {
  return (req, res, next) => {
    try {
      const authHeader = req.headers?.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No token provided' });
      }

      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_ACCESS_SECRET);

      // Role-based injection
      if (decoded.role === 'doctor') {
        req.doctor = decoded;
      } else if (decoded.role === 'patient') {
        req.patient = decoded;
      } else {
        return res.status(403).json({ message: 'Invalid role in token' });
      }

      if (roles.length && !roles.includes(decoded.role)) {
        return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
      }

      if (process.env.NODE_ENV !== 'production') {
        console.log('✅ Decoded JWT:', decoded);
      }

      next();
    } catch (err) {
      console.error('❌ JWT verification failed:', err.message);
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
  };
};
