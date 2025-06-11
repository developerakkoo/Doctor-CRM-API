const mongoose = require('mongoose');

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
    }
});

const Doctor = mongoose.model('Doctor', doctorSchema);

module.exports = Doctor;