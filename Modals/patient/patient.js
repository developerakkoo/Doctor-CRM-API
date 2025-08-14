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
    default: () => new mongoose.Types.ObjectId(),
  },
  billNo: {
    type: Number,
    required: true,
    unique: false
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
}, { _id: false });

const videoSchema = new mongoose.Schema({
  title: String,
  fileUrl: String,
  context: { type: String, enum: ['prescription', 'bill', 'report', 'other'], default: 'other' },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  uploadedAt: { type: Date, default: Date.now }
}, { _id: true });

const appointmentSchema = new mongoose.Schema({
  appointmentDate: { type: Date, required: true },
  reason: String,
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  status: {
    type: String,
    enum: ['Scheduled', 'Completed', 'Cancelled'],
    default: 'Scheduled'
  },
  notes: String
}, { timestamps: true });

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
firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  patientId: { type: String, unique: true },
  password: { type: String, required: true, select: false },
  insuranceProvider: { type: String, required: true },

  dob: Date,
  source: { 
    type: String, 
    enum: ['referral', 'social media', 'google ads', 'walk-in', 'phone call', 'email', 'other'],
    required: true
  },
  priority: { 
    type: String, 
    enum: ['high', 'medium', 'low'], 
    required: true 
  },
  initialStatus: { 
    type: String, 
    enum: ['contact', 'qualified'], 
    required: true 
  },
  referredBy: String,
  initialNotes: String,

  gender: { type: String, enum: ['Male', 'Female', 'Other'] },
  phone: { type: String, unique: true, sparse: true },
  address: String,
  medicalHistory: String,
  allergies: [String],
  currentMedications: [String],
  reports: [reportSchema],
  prescriptions: [prescriptionSchema],
  bills: [billSchema],
  videos: [videoSchema],
  appointments: [appointmentSchema],
  createdAt: { type: Date, default: Date.now }
});

// Auto-hash password before saving
patientSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Validate billNo only for new or modified bills
patientSchema.pre('save', function (next) {
  if (this.isModified('bills')) {
    this.bills.forEach((bill, index) => {
      // bill.isNew works for subdocs created in this session
      const billModified = bill.isNew ||
        (typeof bill.isModified === 'function' && bill.isModified('billNo'));
      if (billModified && !bill.billNo) {
        return next(new Error(`billNo is required for bill at index ${index}`));
      }
    });
  }
  next();
});
patientSchema.pre('save', async function (next) {
  if (!this.patientId) {
    const today = new Date();
    const dateStr = today.toISOString().slice(0,10).replace(/-/g, '');
    const seq = Math.floor(1000 + Math.random() * 9000); // random 4 digits
    this.patientId = `PAT${dateStr}${seq}`;
  }
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});


const Patient = mongoose.model('Patient', patientSchema);
export default Patient;