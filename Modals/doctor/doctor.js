import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

// Schema Definition
const doctorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  title: {
    type: String,
    enum: ['Mr.', 'Mrs.', 'Dr.'],
    default: undefined // Optional
  },
  specialty: {
    type: String,
    required: true
  },
  yearsOfExperience: {
    type: Number,
    required: true
  },
  licenseNumber: {
    type: String,
    unique: true
  },
  professionalBio: {
    type: String,
    default: '' // Optional field
  },
  password: {
    type: String,
    required: true,
    select: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  otpSecret: {
    type: String
  },
  phone: String,
  address: String,
  dob: Date,
  age: Number,
  profile: {
    type: String,
    default: ''
  },
  smtpEmail: { type: String },  
  smtpPassword: { type: String },

  role: {
    type: String,
    enum: ['admin', 'doctor', 'owner'],
    default: 'doctor',
    required: true
  },
  degreePhoto: {
    data: Buffer,
    contentType: String
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    },
    locationName: {
      type: String,
      required: true
    }
  },
  videos: [
    {
      title: String,
      videoUrl: String,
      context: {
        type: String,
        enum: ['prescription', 'bill', 'report'],
        required: true
      },
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  resetPasswordToken: {
    type: String
  },
  resetPasswordExpires: {
    type: Date
  },
  resetOtp: String,
  resetOtpExpiry: Date,
  resetPasswordOtp: { type: String },
  resetPasswordExpires: { type: Date }
});

// ✅ Pre-save hook to hash password if modified
doctorSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

doctorSchema.pre('save', async function (next) {
  if (!this.licenseNumber) {
    const randomPart = Math.floor(100000 + Math.random() * 900000); // 6-digit number
    const timestampPart = Date.now().toString().slice(-4);          // last 4 digits of timestamp
    this.licenseNumber = `LIC-${randomPart}${timestampPart}`;
  }
  next();
});

doctorSchema.pre("save", async function (next) {
  if (this.isModified("smtpPassword") && this.smtpPassword) {
    this.smtpPassword = await bcrypt.hash(this.smtpPassword, 10);
  }
  next();
});
// Geospatial index
doctorSchema.index({ location: '2dsphere' });

const Doctor = mongoose.model('Doctor', doctorSchema);
export default Doctor;