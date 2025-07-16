import express from 'express';
import {
  loginDoctor,
  refreshToken,
  logoutDoctor,
} from '../Controller/auth.controller.js';

const router = express.Router();

// @route   POST /auth/login
// @desc    Login with email, password, and 2FA (OTP)
// @access  Public
router.post('/login', loginDoctor);

// @route   POST /auth/refresh
// @desc    Refresh access token using refresh token cookie
// @access  Public (requires valid refresh token cookie)
router.post('/refresh', refreshToken);

// @route   POST /auth/logout
// @desc    Logout and revoke refresh token
// @access  Public (clears cookie)
router.post('/logout', logoutDoctor);

export default router;
