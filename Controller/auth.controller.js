import Doctor from '../Modals/doctor/doctor.js';
import RefreshToken from '../Modals/RefreshToken.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { oauth2Client } from "../utils/googleAuth.js";
import { encrypt } from "../utils/cryptoHelper.js";
import { google } from "googleapis";

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


// import Doctor from "../models/doctor.js";


export const googleCallback = async (req, res) => {
  try {
    const { code } = req.query;

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Fetch Google user info
    const oauth2 = google.oauth2({
      auth: oauth2Client,
      version: "v2",
    });
    const { data } = await oauth2.userinfo.get(); // contains email, name, picture

    // Check if doctor exists
    let doctor = await Doctor.findOne({ email: data.email });

    if (!doctor) {
      // If new doctor → create profile
      doctor = new Doctor({
        name: data.name || "Unknown",
        email: data.email,
        password: "TEMP", // You can generate random if not needed
        oauthRefreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
        emailVerified: true // Since Google already verified
      });
    } else {
      // If existing doctor → update refresh token
      if (tokens.refresh_token) {
        doctor.oauthRefreshToken = encrypt(tokens.refresh_token);
      }
      doctor.emailVerified = true;
    }

    await doctor.save();

    // ✅ Redirect doctor to CRM dashboard (frontend route)
    res.redirect(`http://localhost:3000/dashboard?email=${doctor.email}`);

  } catch (err) {
    console.error("Google OAuth Error:", err);
    res.status(500).json({ error: "Google OAuth failed" });
  }
};


export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: "Missing token" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const doctor = await Doctor.findById(decoded.id);
    if (!doctor) return res.status(404).json({ error: "Doctor not found" });

    doctor.emailVerified = true;
    await doctor.save();

    res.send("✅ Email verified successfully! You can now connect Gmail.");
  } catch (err) {
    console.error("Email verification failed:", err);
    res.status(400).json({ error: "Invalid or expired token" });
  }
};


export default verifyEmail;
