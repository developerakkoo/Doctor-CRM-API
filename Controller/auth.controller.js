import Doctor from '../Modals/doctor/Doctor.js';
import RefreshToken from '../Modals/RefreshToken.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

import {
  signAccessToken,
  signRefreshToken,
  saveRefreshToken,
} from '../utils/jwt.utils.js';

import { verifyTotpCode } from '../utils/otp.utils.js';

const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

// -------------------- Login --------------------
export const loginDoctor = async (req, res) => {
  const { email, password, otp } = req.body;

  try {
    const doctor = await Doctor.findOne({ email });
    if (!doctor) return res.status(401).json({ msg: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, doctor.password);
    if (!ok) return res.status(401).json({ msg: 'Invalid credentials' });

    const otpValid = verifyTotpCode(doctor, otp);
    if (!otpValid) return res.status(401).json({ msg: 'Invalid 2FA code' });

    const accessToken = signAccessToken(doctor);
    const refreshToken = signRefreshToken(doctor);
    await saveRefreshToken(doctor._id, refreshToken);

    res
      .cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      })
      .json({ accessToken });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// -------------------- Refresh Token --------------------
export const refreshToken = async (req, res) => {
  const { refreshToken } = req.cookies;
  if (!refreshToken) return res.sendStatus(401);

  try {
    const payload = jwt.verify(refreshToken, REFRESH_SECRET);
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const stored = await RefreshToken.findOne({
      doctor: payload.sub,
      tokenHash,
      revoked: false,
    });

    if (!stored || stored.expiresAt < Date.now()) return res.sendStatus(401);

    // Revoke old token
    stored.revoked = true;
    await stored.save();

    const doctor = await Doctor.findById(payload.sub);
    const newAccess = signAccessToken(doctor);
    const newRefresh = signRefreshToken(doctor);
    await saveRefreshToken(doctor._id, newRefresh);

    res
      .cookie('refreshToken', newRefresh, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      })
      .json({ accessToken: newAccess });
  } catch (err) {
    console.error('Refresh error:', err);
    return res.sendStatus(401);
  }
};

// -------------------- Logout --------------------
export const logoutDoctor = async (req, res) => {
  const { refreshToken } = req.cookies;

  try {
    if (refreshToken) {
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await RefreshToken.updateOne({ tokenHash }, { revoked: true });
    }

    res.clearCookie('refreshToken').json({ msg: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};
