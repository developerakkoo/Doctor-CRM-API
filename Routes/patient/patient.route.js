import express from 'express';
import { verifyPatient } from '../../middlewares/verifyPatient.js';
import { createPatient, loginPatient, getPatientProfile, updatePatientProfile, getReportsByPatient, getPrescriptionsByPatient } from '../../Controller/patient/patient.controller.js';
import { verifyAccess } from '../../middlewares/auth.middleware.js';
import { verifyDoctor } from "../../middlewares/verifyDoctor.js";
import { getPatientBills } from '../../Controller/patient/patient.controller.js';

import { sendMessageToDoctor , getChatHistory  } from '../../Controller/patient/chat.controller.js';

import { addReport , addPrescription ,addBill , getTodaysAppointmentsForPatient , createPatientAppointment , getFilteredPatients , getDoctorsBySpecialty } from '../../Controller/patient/patient.controller.js';

import { scheduleAppointment } from '../../Controller/patient/patient.controller.js';

// import { getAllAppointments } from '../../Controller/patient/patient.controller.js';

const router = express.Router();

// Patient registration (only doctor can create patient)
router.post("/create", verifyDoctor, createPatient);

// Patient login
router.post('/login', loginPatient);

// Profile
router.get('/profile', verifyPatient, getPatientProfile);
router.put('/profile/update', verifyPatient, updatePatientProfile);


// Reports and prescriptions
router.post('/report', verifyAccess(['doctor']), addReport);
router.get('/reports', verifyAccess(['patient']), getReportsByPatient);

router.post('/prescription', verifyAccess(['doctor']), addPrescription);
router.get('/prescriptions', verifyAccess(['patient']), getPrescriptionsByPatient);

router.post('/bill', verifyAccess(['doctor']), addBill);
router.get('/bills', verifyAccess(['patient']), getPatientBills);

router.post('/chat/send', verifyAccess(['patient']), sendMessageToDoctor);

router.get('/chat/history', verifyAccess(['patient']), getChatHistory);

// router.post('/appointments/schedule', verifyAccess(['patient']), scheduleAppointment);

// router.get('/appointments', verifyAccess(['patient']), getAllAppointments);

// appointment routes --> 
router.post('/appointments/create', verifyAccess(['patient']), createPatientAppointment);

router.get('/appointments/today', verifyAccess(['patient']), getTodaysAppointmentsForPatient);

//  /api/doctors/recent-patients

router.get('/filter', verifyAccess(['doctor']), getFilteredPatients);

router.get('/doctors', verifyAccess(['patient']), getDoctorsBySpecialty);

export default router;