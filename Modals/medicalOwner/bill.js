import mongoose from 'mongoose';

const billSchema = new mongoose.Schema({
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient',
        required: true,
    },
    medicalOwnerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MedicalOwner',
        required: true,
    },
    items: [
        {
            medicineId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Medicine',
                required: true,
            },
            quantity: { type: Number, required: true },
            price: { type: Number, required: true },
        },
    ],
    totalAmount: {
        type: Number,
        required: true,
    },
    paymentStatus: {
        type: String,
        enum: ['paid', 'unpaid', 'pending'],
        default: 'unpaid',
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    billNo: {
        type: String,
        required: true,
        unique: true
    }

});

export default mongoose.model('Bill', billSchema);
