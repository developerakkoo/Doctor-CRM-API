import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import Doctor from '../../Modals/doctor/Doctor.js'; // adjust path if needed
import dotenv from 'dotenv';
dotenv.config();

const DB_URI = process.env.MONGO_URI; // your MongoDB connection string

const migratePasswords = async () => {
  try {
    await mongoose.connect(DB_URI);
    console.log('MongoDB Connected');

    const doctors = await Doctor.find({});
    for (let doctor of doctors) {
      // Skip if password is missing
      if (!doctor.password) {
        console.log(`Skipping doctor ${doctor.email} – password is missing`);
        continue;
      }

      // Hash only if not already hashed
      if (!doctor.password.startsWith('$2b$')) {
        doctor.password = await bcrypt.hash(doctor.password, 10);
        await doctor.save();
        console.log(`Hashed password for: ${doctor.email}`);
      }
    }

    console.log('Password migration complete!');
    mongoose.disconnect();
  } catch (error) {
    console.error('Migration error:', error);
    mongoose.disconnect();
  }
};


migratePasswords();
