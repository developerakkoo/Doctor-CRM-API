import mongoose from 'mongoose';
import dotenv from 'dotenv';
// import Patient from './path/to/your/PatientModel.js'; // adjust path
// import Counter from './path/to/your/CounterModel.js'; // adjust path
import Patient from './Modals/patient/patient.js';
import Counter from './Modals/patient/counter.js';
dotenv.config();

async function fixMissingBillNos() {
  await mongoose.connect(process.env.MONGO_URI);

  // Find all patients having bills with missing or undefined billNo
  const patients = await Patient.find({ 'bills.billNo': { $exists: false } });

  console.log(`Found ${patients.length} patients with bills missing billNo.`);

  for (const patient of patients) {
    let updated = false;

    for (const bill of patient.bills) {
      if (!bill.billNo) {
        // Generate next billNo from counter
        const counter = await Counter.findOneAndUpdate(
          { name: 'bill' },
          { $inc: { seq: 1 } },
          { new: true, upsert: true }
        );

        bill.billNo = counter.seq;
        updated = true;
        console.log(`Assigned billNo ${bill.billNo} for bill ${bill._id} of patient ${patient.patientId}`);
      }
    }

    if (updated) {
      await patient.save();
      console.log(`Saved patient ${patient.patientId} with fixed bills`);
    }
  }

  console.log('Finished fixing bills');
  await mongoose.disconnect();
}

fixMissingBillNos().catch(console.error);
