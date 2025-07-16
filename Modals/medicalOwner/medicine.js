import mongoose from 'mongoose';

const medicineSchema = new mongoose.Schema({
  name: String,
  brand: String,
  price: Number,
  quantity: Number,
  expiryDate: Date,
  medicalOwnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'MedicalOwner' },
});

export default mongoose.model('Medicine', medicineSchema);
