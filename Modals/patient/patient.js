import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';


const reportSchema = new mongoose.Schema({
  title: String,
  date: Date,
  findings: String,
  fileUrl: String,
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' }
}, { _id: true });

const prescriptionSchema = new mongoose.Schema({
  medication: String,
  dosage: String,
  duration: String,
  date: Date,
  prescribedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' }
}, { _id: true });


const billSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    default: () => new mongoose.Types.ObjectId(), // explicitly assign a unique ObjectId as billId
  },
  billNo: {
    type: Number,
    required: true,
    unique: false // remove 'unique' since these are embedded documents
  },
  services: [
    {
      name: String,
      cost: Number
    }
  ],
  totalAmount: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  billedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor'
  },
  fileUrl: {
    type: String
  }
}, { _id: false }); // _id is defined manually above

const patientSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    unique: true,
    sparse: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  fullName: { type: String, required: true },
  patientId: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  dob: Date,
  gender: { type: String, enum: ['Male', 'Female', 'Other'] },
  phone: { type: String, unique: true, sparse: true },
  address: String,
  medicalHistory: String,
  allergies: [String],
  currentMedications: [String],
  reports: [reportSchema],
  prescriptions: [prescriptionSchema],
  bills: [billSchema],
  createdAt: { type: Date, default: Date.now }
});



// ✅ Auto-hash password before saving
patientSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

const Patient = mongoose.model('Patient', patientSchema);
export default Patient;