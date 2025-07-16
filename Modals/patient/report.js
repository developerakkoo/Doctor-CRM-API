// models/report.model.js
import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  findings: {
    type: String,
    required: true,
  },
  reportDate: {
    type: Date,
    default: Date.now,
  },
  fileUrl: {
    type: String, // optional URL for attachments (PDF/image)
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true,
  },
});

const Report = mongoose.model('Report', reportSchema);
export default Report;
