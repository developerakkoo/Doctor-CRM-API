// const mongoose = require('mongoose');

// const connectDB = async () => {
//     try {
//         await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/doctor-crm', {
//             useNewUrlParser: true,
//             useUnifiedTopology: true
//         });
//         console.log('MongoDB Connected');
//     } catch (error) {
//         console.error('MongoDB connection error:', error);
//         process.exit(1);
//     }
// };

// module.exports = connectDB;

// const mongoose = require('mongoose');
import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/doctor-crm');
        console.log(' MongoDB Connected');
    } catch (error) {
        console.error(' MongoDB connection error:', error);
        process.exit(1);
    }
};

export default connectDB;
// module.exports = connectDB;