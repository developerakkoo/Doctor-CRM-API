import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const subAdminSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  designation: { type: String, required: true },
  accessLevel: {
    type: String,
    enum: ['read', 'write', 'admin'],
    default: 'read',
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  phone: String,
  address: String,
  totpSecret: { type: String , select: false },           // stores the base32 secret
  totpEnabled: { type: Boolean, default: false }    
}, { timestamps: true });

subAdminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

export default mongoose.model('SubAdmin', subAdminSchema);
