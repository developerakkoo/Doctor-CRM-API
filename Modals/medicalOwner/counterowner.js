// Modals/medicalOwner/counterowner.js
import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  value: {
    type: Number,
    required: true,
    default: 1,
  }
});

// Avoid OverwriteModelError and ensure only one Counter model is compiled
export default mongoose.models.Counter || mongoose.model('Counter', counterSchema);
