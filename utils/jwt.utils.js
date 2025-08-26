import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import RefreshToken from '../Modals/RefreshToken.js';

// ✅ Must match the secret used for signing and verifying
const ACCESS_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

export const signAccessToken = (doctor) =>
  jwt.sign(
    { doctorId: doctor._id, role: doctor.role },
    ACCESS_SECRET,
    { expiresIn: '1h' }
  );

export const signRefreshToken = (doctor) =>
  jwt.sign(
    { doctorId: doctor._id },
    REFRESH_SECRET,
    { expiresIn: '30d' }
  );

export const saveRefreshToken = async (doctorId, token) => {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  return await RefreshToken.create({
    doctor: doctorId,
    tokenHash,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });
};
