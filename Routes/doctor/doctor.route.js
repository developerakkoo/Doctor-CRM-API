import express from 'express';
import {
  addDoctor,
  getAllDoctors,
  deleteDoctor,
  updateDoctor,
  uploadDegreePhoto,
  loginDoctor,
  getDoctorById,
  changePassword,
  confirmChangePassword,
  resetDoctorPassword,
  getDoctorPatients,
  requestPasswordReset,
  getDoctorVideos,
  getPatientDetails,
  getPatientCounts,
  createAppointment,
  uploadDoctorVideo,
  getWeeklyPatientCount,
  updatePatientByDoctor,
  getPatientOverviewStats,
  getPatientWeeklyStats,
  editAppointment,
  deleteAppointment,
  updateSmtpCredentials,
  sendAppointmentEmail,
  streamDoctorVideo,
  getTodaysAppointments,
  getUpcomingAppointmentsForDoctor,
  getFilteredAppointments,
  getRecentPatientsForDoctor,
  getPatientsStats,
  logoutDoctor, googleAuth , googleAuthCallback
} from '../../Controller/doctor/doctor.controller.js';

import upload from '../../middlewares/upload.js';
import uploadVideoMiddleware from '../../middlewares/videoUpload.middleware.js';
import { verifyAccess } from '../../middlewares/auth.middleware.js';
import { verifyDoctorToken } from '../../middlewares/authDoctor.middleware.js';
import { authorize, authorizeAdminOnly } from '../../middlewares/role.middleware.js';
import verifyEmail from '../../Controller/auth.controller.js';

// ✅ OAuth utilities
import { oauth2Client } from '../../utils/googleAuth.js';
// import { handleOAuthCallback } from '../../utils/callback.js';

const router = express.Router();

//
// 🔹 Public auth routes
//
router.post('/register', upload.single('profile'), addDoctor);
router.get('/verify-email', verifyEmail);
router.post('/login', loginDoctor);

//
// 🔹 Google OAuth routes
//
router.get('/auth/google', googleAuth);

// Google callback route (redirect URI must match your Google console setup)
router.get('/auth/google/callback', googleAuthCallback);

//
// 🔹 Doctor routes (protected)
//
router.get('/profile', getAllDoctors);
router.get('/profile/:id', verifyAccess(['doctor']), getDoctorById);
router.delete('/delete/:id', verifyAccess(['doctor']), deleteDoctor);
router.put('/update/:id', verifyAccess(['doctor']), upload.single('profile'), updateDoctor);
router.post('/upload-degree/:id', verifyAccess(['doctor']), upload.single('degreePhoto'), uploadDegreePhoto);

router.post('/change-password', verifyAccess(['doctor']), changePassword);
router.post('/change-password-confirm', confirmChangePassword);

router.post('/reset-password-request', requestPasswordReset);
router.post('/reset-password', resetDoctorPassword);

router.post('/logout', verifyAccess(['doctor']), logoutDoctor);

router.get('/patients', verifyAccess(['doctor']), getDoctorPatients);
router.get('/patients/:patientId', verifyAccess(['doctor']), getPatientDetails);
router.put('/patients/update/:patientId', verifyAccess(['doctor']), updatePatientByDoctor);

router.get('/dashboard/patient-counts', verifyAccess(['doctor']), getPatientCounts);
router.post('/upload-video/:patientId', verifyAccess(['doctor']), uploadVideoMiddleware, uploadDoctorVideo);
router.get('/videos', verifyAccess(['doctor']), getDoctorVideos);
router.get('/videos/stream/:videoId', verifyAccess(['doctor']), streamDoctorVideo);

//
// 🔹 Appointment routes
//
router.post('/appointments/create', verifyAccess(['doctor']), createAppointment);
router.get('/appointments/today', verifyAccess(['doctor']), getTodaysAppointments);
router.patch('/appointments/edit/:id/', verifyAccess(['doctor']), editAppointment);
router.get('/upcoming-appointments', verifyAccess(['doctor']), getUpcomingAppointmentsForDoctor);
router.get('/appointments/filter', verifyAccess(['doctor']), getFilteredAppointments);
router.delete('/appointments/delete/:appointmentId', verifyAccess(['doctor']), deleteAppointment);
router.post('/appointments/notify', verifyAccess(['doctor']), sendAppointmentEmail);

//
// 🔹 Dashboard / stats
//
router.get('/recent-patients', verifyAccess(['doctor']), getRecentPatientsForDoctor);
router.get('/stats', verifyAccess(['doctor']), getPatientsStats);
router.get('/count/week', verifyAccess(['doctor']), getWeeklyPatientCount);
router.get('/patient-stats/months', verifyAccess(['doctor']), getPatientOverviewStats);
router.get('/patient-stats/weeks', verifyAccess(['doctor']), getPatientWeeklyStats);

//
// 🔹 SMTP
//
router.post('/update-smtp-credentials', verifyAccess(['doctor']), updateSmtpCredentials);

export default router;
