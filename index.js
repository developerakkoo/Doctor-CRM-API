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

import videoRoutes from "./Routes/video.route.js";

const app = express();
const PORT = process.env.PORT || 9191;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Middleware


// app.use(cors({
//   origin: 'http://localhost:3000', // Adjust if your frontend runs elsewhere
//   credentials: true,
//   exposedHeaders: ['Authorization'],
// }));
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


app.use(express.json());
app.use(express.json({ limit: '2gb' }));
app.use(express.urlencoded({ extended: true, limit: '2gb' }));

// app.use((req, res, next) => {
//   res.header("Access-Control-Allow-Origin","*");// or specific origin
//   res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, Range");
//   res.header("Access-Control-Expose-Headers", "Content-Range, Accept-Ranges");
//   next();
// });
// Optional: log origin for debugging
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, Range");
  res.header("Access-Control-Expose-Headers", "Authorization, Content-Range, Accept-Ranges");
  next();
});


app.use(express.urlencoded({ extended: true }));
// app.use('/uploads', express.static('uploads')); // Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Connect to MongoDB (only once)
app.use('/auth', authRoutes);

connectDB();

// API Routes

app.use("/api/videos", videoRoutes);
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