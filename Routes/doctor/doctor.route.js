import express from 'express';
import { addDoctor,getAllDoctors,deleteDoctor,updateDoctor,uploadDegreePhoto,
        loginDoctor,getDoctorById,changePassword ,confirmChangePassword} from '../../Controller/doctor/doctor.controller.js';

import upload from '../../middlewares/upload.js';
import { logoutDoctor } from '../../Controller/doctor/doctor.controller.js';
import { verifyAccess } from '../../middlewares/auth.middleware.js';
import { authorize, authorizeAdminOnly } from '../../middlewares/role.middleware.js';


import { resetDoctorPassword , getDoctorPatients , resetPassword } from '../../Controller/doctor/doctor.controller.js';
import { getPatientDetails , getPatientCounts } from "../../Controller/doctor/doctor.controller.js";

const router = express.Router();
  
// ✅ Public routes
router.post('/register', upload.single('profile'), addDoctor);
router.post('/login', loginDoctor);
router.get('/profile', getAllDoctors);

// ✅ Protected routes
router.get('/profile/:id',verifyAccess,authorize('admin', 'doctor'),getDoctorById);

router.delete('/:id',verifyAccess,authorizeAdminOnly,deleteDoctor);

router.put('/update/:id',verifyAccess,authorize('admin', 'doctor'),upload.single('profile'),updateDoctor);

router.post('/upload-degree/:id',verifyAccess,authorize('doctor'),upload.single('degreePhoto'),uploadDegreePhoto);

router.post('/change-password',verifyAccess(['doctor']),authorize('doctor'),changePassword);

router.post('/change-password-confirm', confirmChangePassword);

router.post('/reset-password', resetPassword);

router.post('/reset-password/:token', resetDoctorPassword);

router.post('/logout', verifyAccess, logoutDoctor);

router.get('/patients', verifyAccess(['doctor']), getDoctorPatients);

router.get("/patients/:patientId", verifyAccess(['doctor']), getPatientDetails);

router.get("/dashboard/patient-counts", verifyAccess(['doctor']), getPatientCounts);


export default router;