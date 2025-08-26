import express from 'express';
import { registerSubAdmin, getAllSubAdmins, getSubAdminById, updateSubAdmin, deleteSubAdmin, loginSubAdmin } from '../../Controller/subAdmin/subadmin.controller.js';


import { verifyDoctorToken } from '../../middlewares/authDoctor.middleware.js';

const router = express.Router();

router.post('/register', verifyDoctorToken, registerSubAdmin);
router.get('/', verifyDoctorToken, getAllSubAdmins);
router.get('/:subAdminId', verifyDoctorToken, getSubAdminById);

router.put('/:subAdminId', verifyDoctorToken, updateSubAdmin);
router.delete('/delete/:subAdminId', verifyDoctorToken, deleteSubAdmin);

router.post('/login', loginSubAdmin);

export default router;