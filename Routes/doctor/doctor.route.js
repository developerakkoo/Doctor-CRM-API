import express from 'express';
import { addDoctor,getAllDoctors,deleteDoctor,updateDoctor,uploadDegreePhoto,
        loginDoctor,getDoctorById,changePassword ,confirmChangePassword} from '../../Controller/doctor/doctor.controller.js';

import upload from '../../middlewares/upload.js';
import { logoutDoctor } from '../../Controller/doctor/doctor.controller.js';
import { verifyAccess } from '../../middlewares/auth.middleware.js';
import { authorize, authorizeAdminOnly } from '../../middlewares/role.middleware.js';


import { resetDoctorPassword , getDoctorPatients , resetPassword,requestPasswordReset , getDoctorVideos } from '../../Controller/doctor/doctor.controller.js';
import { getPatientDetails , getPatientCounts , createAppointment, uploadDoctorVideo , getFilteredPatients,
        streamDoctorVideo , getTodaysAppointments , getUpcomingAppointmentsForDoctor , getFilteredAppointments , getRecentPatientsForDoctor , getPatientsStats } from "../../Controller/doctor/doctor.controller.js";

import uploadVideoMiddleware  from '../../middlewares/videoUpload.middleware.js';
import { verifyDoctorToken } from '../../middlewares/authDoctor.middleware.js';

const router = express.Router();
  
// ✅ Public routes
router.post('/register', upload.single('profile'), addDoctor);
router.post('/login', loginDoctor);
router.get('/profile', getAllDoctors);

// ✅ Protected routes
router.get('/profile/:id',verifyAccess(['doctor']),getDoctorById);

router.delete('/delete/:id',verifyAccess(['doctor']),deleteDoctor);

router.put('/update/:id',verifyAccess(['doctor']),upload.single('profile'),updateDoctor);

router.post('/upload-degree/:id',verifyAccess(['doctor']),upload.single('degreePhoto'),uploadDegreePhoto);

router.post('/change-password',verifyAccess(['doctor']),changePassword);

router.post('/change-password-confirm', confirmChangePassword);

router.post('/reset-password-request', requestPasswordReset);

router.post('/reset-password/:token', resetDoctorPassword);

router.post('/logout', verifyAccess(['doctor']), logoutDoctor);

router.get('/patients', verifyAccess(['doctor']), getDoctorPatients);

router.get("/patients/:patientId", verifyAccess(['doctor']), getPatientDetails);

router.get("/dashboard/patient-counts", verifyAccess(['doctor']), getPatientCounts);

router.post('/upload-video/:patientId',verifyAccess(['doctor']), uploadVideoMiddleware, uploadDoctorVideo);

router.get('/videos', verifyAccess(['doctor']), getDoctorVideos);

router.get('/videos/stream/:videoId', verifyAccess(['doctor']) ,streamDoctorVideo);

// appointment routes..

router.post('/appointments/create', verifyAccess(['doctor']), createAppointment);

router.get('/appointments/today', verifyAccess(['doctor']), getTodaysAppointments);

router.get("/upcoming-appointments", verifyAccess(['doctor']), getUpcomingAppointmentsForDoctor);

router.get("/appointments/filter",verifyAccess(['doctor']), getFilteredAppointments);

//  /api/doctors/recent-patients
router.get('/recent-patients', verifyAccess(['doctor']), getRecentPatientsForDoctor);

// routes/patientRoutes.js
router.get('/stats',verifyAccess(['doctor']) , getPatientsStats);

router.get("/patients/filter", verifyAccess(['doctor']), getFilteredPatients);

export default router;