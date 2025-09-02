import express from "express";
import {
  loginDoctor,
  refreshToken,
  logoutDoctor,
} from "../Controller/auth.controller.js";
import Doctor from "../Modals/doctor/doctor.js";
import jwt from "jsonwebtoken";
import sendDoctorMail from "../utils/sendEmail.js";
import { oauth2Client } from "../utils/googleAuth.js";
import { encrypt } from "../utils/encryption.js";
import fetch from "node-fetch"; // to get Google profile info

const router = express.Router();

// =======================
//  Doctor Registration
// =======================
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existing = await Doctor.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Doctor already exists" });
    }

    const doctor = new Doctor({ name, email, password });
    await doctor.save();

    // Generate verification token
    const token = jwt.sign({ id: doctor._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    const verifyLink = `${process.env.FRONTEND_URL}/verify-email/${token}`;

    // Send verification email
    await sendDoctorMail(
      doctor,
      "Verify Your Email",
      `Click the link to verify: ${verifyLink}`
    );

    res.status(201).json({ message: "Doctor registered. Please verify email." });
  } catch (err) {
    console.error("❌ Register error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// =======================
//  Verify Email
// =======================
router.get("/verify-email/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const doctor = await Doctor.findById(decoded.id);
    if (!doctor) return res.status(400).json({ message: "Invalid token" });

    doctor.emailVerified = true;
    await doctor.save();

    res.json({ message: "Email verified successfully!" });
  } catch (err) {
    console.error("❌ Verify error:", err);
    res.status(400).json({ message: "Invalid or expired token" });
  }
});

// =======================
//  Login / Refresh / Logout
// =======================
router.post("/login", loginDoctor);
router.post("/refresh", refreshToken);
router.post("/logout", logoutDoctor);

// =======================
//  Google OAuth - Step 1: Redirect to Google
// =======================
router.get("/google", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
  });
  res.redirect(url);
});

// =======================
//  Google OAuth - Step 2: Callback
// =======================
router.get("/google/callback", async (req, res) => {
  try {
    const { code } = req.query;

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Fetch doctor profile (email) from Google
    const userinfoRes = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      { headers: { Authorization: `Bearer ${tokens.access_token}` } }
    );
    const profile = await userinfoRes.json();

    if (!profile.email) {
      return res.status(400).json({ message: "Failed to fetch Google email" });
    }

    // Find or create doctor
    let doctor = await Doctor.findOne({ email: profile.email });
    if (!doctor) {
      doctor = new Doctor({
        name: profile.name || "Doctor",
        email: profile.email,
        password: null, // since OAuth login
      });
    }

    // Save encrypted refresh token
    if (tokens.refresh_token) {
      doctor.oauthRefreshToken = encrypt(tokens.refresh_token);
    }

    await doctor.save();

    res.json({ message: "Google account linked successfully!", doctor });
  } catch (err) {
    console.error("❌ Google callback error:", err);
    res.status(500).json({ message: "OAuth callback failed" });
  }
});

export default router;
