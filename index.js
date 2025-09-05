import dotenv from 'dotenv';
dotenv.config();

console.log(" JWT_SECRET loaded:", process.env.JWT_SECRET);

import express from 'express';   
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import connectDB from './config/db.js';

// ✅ Only keep doctor routes (merged auth into doctorRoutes)
import doctorRoutes from './Routes/doctor/doctor.route.js';
import patientRoutes from './Routes/patient/patient.route.js';
import medicalOwnerRoutes from './Routes/medicalOwner/medicalOwner.route.js';
import subAdminRoutes from './Routes/subadmin/subadmin.route.js';
import notificationRoutes from "./Routes/notification/notification.routes.js";
import videoRoutes from "./Routes/video.route.js";

const app = express();
const PORT = process.env.PORT || 9191;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CORS setup
const allowedOrigins = ['http://localhost:3000', 'http://localhost:5173'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  exposedHeaders: ['Authorization'],
})); 

app.use(express.json()); // 👈 this is required for JSON body parsing


app.use(express.json({ limit: '2gb' }));
app.use(express.urlencoded({ extended: true, limit: '2gb' }));

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect DB
connectDB();

// ✅ API Routes
app.use("/api/videos", videoRoutes);
app.use('/api/v1/doctors', doctorRoutes);   // includes register, login, verify-email, etc.
app.use('/api/patient', patientRoutes);
app.use('/api/medical-owner', medicalOwnerRoutes);
app.use('/api/doctor/sub-admin', subAdminRoutes);
app.use("/api/notifications", notificationRoutes);

// Reports
app.use('/reports', express.static('public/reports'));

// Root
app.get('/', (req, res) => {
  res.send('Doctor-CRM API Dashboard');
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server started on port ${PORT}`);
});
