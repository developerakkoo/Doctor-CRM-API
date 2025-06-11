const express = require('express');
const router = express.Router();


// Importing the controller functions
const { getAllDoctors, addDoctor, updateDoctor, deleteDoctor } = require('../../Controller/doctor/doctor.controller');


//All Routes for Doctor Management
router.get('/doctor', getAllDoctors);
router.post('/register/doctor', addDoctor);

router.put('/doctor/:id', updateDoctor);
router.delete('/doctor/:id', deleteDoctor);

// Exporting the router for Doctor Management
module.exports = router;