import mongoose from 'mongoose';


const appointmentSchema = new mongoose.Schema({
  patientId: { type: String, required: true },
  doctorId: { type: String, required: true },
  preferredDate: { type: String, required: true }, // YYYY-MM-DD
  preferredTime: { type: String, required: true }, // HH:MM
  reason: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'Confirmed', 'Rejected'], default: 'Pending' },
  createdAt: { type: Date, default: Date.now }
});

const Appointment = mongoose.model('Appointment', appointmentSchema);
export default Appointment;