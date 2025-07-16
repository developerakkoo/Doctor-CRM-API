// models/RefreshToken.js
import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema({
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  tokenHash: { type: String, required: true },  
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
  revoked: { type: Boolean, default: false },
});

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);
export default RefreshToken;