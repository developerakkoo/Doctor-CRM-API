// modals/patient/counter.js
import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  seq: { type: Number, default: 1000 } // Starting billNo
});

const Counter = mongoose.model('Counter', counterSchema);
export default Counter;
