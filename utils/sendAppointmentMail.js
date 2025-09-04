// utils/sendAppointmentMail.js
import Doctor from "../Modals/doctor/doctor.js";
import Patient from "../Modals/patient/patient.js";
import Appointment from "../Modals/patient/appointment.js";
import sendDoctorMail from "../utils/sendDoctorMail.js";

const sendAppointmentMail = async (doctorId) => {
  try {
    // ✅ Fetch latest appointment
    const latestAppointment = await Appointment.findOne({ doctorId })
      .sort({ createdAt: -1 })
      .lean();

    if (!latestAppointment) {
      return { success: false, error: "No appointment found for this doctor" };
    }

    const patient = await Patient.findById(latestAppointment.patientId).lean();
    const doctor = await Doctor.findById(doctorId).lean();

    if (!doctor || !patient) {
      return { success: false, error: "Doctor or patient not found" };
    }

    // ✅ Email body
    const emailHtml = `
      <h3>Hello ${patient.firstName},</h3>
      <p>Your appointment has been confirmed.</p>
      <ul>
        <li><strong>Date:</strong> ${new Date(latestAppointment.appointmentDate).toDateString()}</li>
        <li><strong>Time:</strong> ${latestAppointment.appointmentTime}</li>
        <li><strong>Doctor:</strong> Dr. ${doctor.name}</li>
        <li><strong>Location:</strong> ${latestAppointment.location || "Clinic"}</li>
      </ul>
      <p>Please be on time and bring any prior reports if available.</p>
      <br>
      <p>Thank you,<br/> Dr. ${doctor.name}</p>
    `;

    // ✅ Send via Gmail API (doctor → patient)
    return await sendDoctorMail(
      doctor,
      patient.email, // 👈 patient is the recipient
      "📅 Appointment Confirmation",
      emailHtml
    );

  } catch (error) {
    console.error("❌ Error in sendAppointmentMail:", error.message);
    return { success: false, error: error.message };
  }
};

export default sendAppointmentMail;
