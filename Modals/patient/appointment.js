import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema({
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: false
  },

  // ✅ Patient details snapshot at time of booking
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },

  // ✅ Appointment details
  appointmentType: {
    type: String,
    enum: ['Consultation', 'Follow-up', 'Treatment', 'Emergency'],
    required: true
  },
  duration: {
    type: String,
    enum: ['30 minutes', '45 minutes', '60 minutes', '90 minutes', '120 minutes'],
    required: true
  },
  appointmentDate: {
    type: Date,
    required: true
  },
  appointmentTime: {
    type: String,
    required: true
  },
  location: {
    type: String,
    default: 'Clinic'
  },
  status: {
    type: String,
    enum: ['Scheduled', 'Completed', 'Cancelled'],
    default: 'Scheduled'
  },
  notes: {
    type: String
  }
}, { timestamps: true });

// ✅ Fix OverwriteModelError for ESM + Nodemon
const Appointment = mongoose.models?.Appointment || mongoose.model('Appointment', appointmentSchema);
export default Appointment;
