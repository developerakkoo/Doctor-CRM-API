import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

// Schema Definition
const doctorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  specialty: {
    type: String,
    required: true
  },
  yearsOfExperience: {
    type: Number,
    required: true
  },
  password: {
    type: String,
    required: true,
    select: false // Exclude by default, fetch manually when needed
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
  }
  

});

// ✅ Pre-save hook to hash password if modified
doctorSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);

  // Optional debug
  // console.log('Password hashed before save');
  next();
});

// Geospatial index
doctorSchema.index({ location: '2dsphere' });

const Doctor = mongoose.model('Doctor', doctorSchema);
export default Doctor;