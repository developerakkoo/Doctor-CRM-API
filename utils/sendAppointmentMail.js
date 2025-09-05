// utils/sendAppointmentMail.js
import Doctor from "../Modals/doctor/doctor.js";
import sendDoctorMail from "../utils/sendDoctorMail.js";

const sendAppointmentMail = async (appointment) => {
  try {
    // ✅ Fetch doctor
    const doctor = await Doctor.findById(appointment.doctorId);
    if (!doctor) {
      return { success: false, error: "Doctor not found" };
    }

    const subject = `Appointment Confirmation with Dr. ${doctor.name}`;

    const html = `
      <p>Hello ${appointment.name},</p>
      <p>Your appointment has been confirmed. Here are the details:</p>

      <ul>
        <li><b>Date:</b> ${new Date(appointment.appointmentDate).toDateString()}</li>
        <li><b>Time:</b> ${appointment.appointmentTime}</li>
        <li><b>Doctor:</b> Dr. ${doctor.name}</li>
        <li><b>Patient Email:</b> ${appointment.email}</li>
        <li><b>Phone:</b> ${appointment.phone}</li>
        <li><b>Location:</b> ${appointment.location}</li>
        <li><b>Duration:</b> ${appointment.duration}</li>
        <li><b>Appointment Type:</b> ${appointment.appointmentType}</li>
        <li><b>Status:</b> ${appointment.status}</li>
        <li><b>Notes:</b> ${appointment.notes || "None"}</li>
      </ul>

      <p>Please be on time and bring any prior reports if available.</p>
      <p>Thank you,<br/>Dr. ${doctor.name}</p>
    `;

    const result = await sendDoctorMail(
      doctor,
      appointment.email.trim(),
      subject,
      html
    );

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, message: "Appointment email sent successfully" };
  } catch (err) {
    console.error("❌ Error in sendAppointmentMail:", err.message);
    return { success: false, error: err.message };
  }
};

export default sendAppointmentMail;
