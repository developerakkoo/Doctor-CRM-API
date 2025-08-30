import nodemailer from "nodemailer"; 
import Doctor from "../Modals/doctor/doctor.js";
import { decrypt } from "./encryption.js";

export const sendEmail = async ({ doctorId, to, subject, html }) => {
  try {
    const doctor = await Doctor.findById(doctorId).lean();

    // ✅ use doctor-specific SMTP if exists, otherwise throw/fallback
    if (!doctor || !doctor.smtpPassword) {
      throw new Error("SMTP credentials not set for this doctor");
    }

    const decryptedPassword = decrypt(doctor.smtpPassword);

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: doctor.email,
        pass: decryptedPassword,
      },
    });

    await transporter.sendMail({
      from: doctor.email,
      to,
      subject,
      html,
    });

    console.log("✅ Email sent to:", to);
    return { success: true };   // <-- return success object
  } catch (error) {
    console.error("❌ Email send failed:", error.message);
    return { success: false, error: error.message }; // <-- return failure
  }
};
export default sendEmail;
