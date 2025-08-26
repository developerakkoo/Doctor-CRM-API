// models/medicalOwner.js
import mongoose from 'mongoose';

const medicalOwnerSchema = new mongoose.Schema({
 fullName: {
    type: String,
    required: true,
    trim: true
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },

  password: {
    type: String,
    required: true
  },

  totpSecret: {
    type: String,
    required: true
  },

  phone: {
    type: String,
    default: ''
  },

  shopName: {
    type: String,
    default: ''
  },

  address: {
    type: String,
    default: ''
  },

  linkedDoctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },

  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('MedicalOwner', medicalOwnerSchema);