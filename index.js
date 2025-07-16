import dotenv from 'dotenv';
dotenv.config();
console.log(" JWT_SECRET loaded:", process.env.JWT_SECRET);

import express from 'express';   
import mongoose from 'mongoose';

import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import connectDB from './config/db.js';
import doctorRoutes from './Routes/doctor/doctor.route.js';
import authRoutes from './Routes/auth.route.js';


import patientRoutes from './Routes/patient/patient.route.js';
import medicalOwnerRoutes from './Routes/medicalOwner/medicalOwner.route.js';
import subAdminRoutes from './Routes/subadmin/subadmin.route.js';
import notificationRoutes from "./Routes/notification/notification.routes.js";


const app = express();
const PORT = process.env.PORT || 3434;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// app.use('/uploads', express.static('uploads')); // Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Connect to MongoDB (only once)
app.use('/auth', authRoutes);

connectDB();

// API Routes
app.use('/api/v1/doctors', doctorRoutes);
app.use('/api/doctors', doctorRoutes);
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/patient', patientRoutes);

app.use('/api/medical-owner', medicalOwnerRoutes);

app.use('/api/doctor/sub-admin', subAdminRoutes);

app.use('/reports', express.static('public/reports'));

app.use("/api/notifications", notificationRoutes);

// Root route
app.get('/', (req, res) => {
    res.send('Doctor-CRM API Dashboard');
});

// Start server
app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});