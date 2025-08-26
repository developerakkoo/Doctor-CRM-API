// routes/medicalOwner.route.js
import express from 'express';
import { loginMedicalOwner , registerMedicalOwner , getMedicalOwnerProfile , generatePaymentQRCode, 
    updateMedicalOwnerProfile ,deleteMedicine, generateBill, getBillById,
    uploadMedicineExcel , addMedicine , getMedicines , updateMedicineDetails } from '../../Controller/medicalOwner/medicalOwner.controller.js';

import { verifyMedicalOwner } from '../../middlewares/authMedical.middleware.js';
// import { verifyAccess } from '../../Middlewares/authPatient.middleware.js';
// import { uploadExcel } from '../../middlewares/uploadExcel.middleware.js';
// import { uploadMedicineExcel } from '../../Controller/medicalOwner/medicine.controller.js';
import upload from '../../middlewares/uploadmiddlware.js'; // path to your multer setup


const router = express.Router();

router.post('/register', registerMedicalOwner);
router.post('/login', loginMedicalOwner);

router.get('/profile', verifyMedicalOwner, getMedicalOwnerProfile); // ← protected route

router.put('/update-profile', verifyMedicalOwner, updateMedicalOwnerProfile);

router.post('/medicines/upload-excel',verifyMedicalOwner,upload.single('file'), uploadMedicineExcel);

router.post('/medicines', verifyMedicalOwner, addMedicine);
router.get('/medicines', verifyMedicalOwner, getMedicines);

// routes/medicalOwner.route.js
router.put('/medicines/:medicineId',verifyMedicalOwner,updateMedicineDetails);

// routes/medicalOwner.route.js
router.delete('/medicines/:medicineId',  verifyMedicalOwner, deleteMedicine );


router.post('/bills/generate',verifyMedicalOwner,generateBill);

router.get('/bills/:billId', verifyMedicalOwner, getBillById);

router.post('/qr-link', generatePaymentQRCode);



export default router;  