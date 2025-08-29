import nodemailer from "nodemailer";
import Doctor from "../Modals/doctor/doctor.js";
import { decrypt } from "./encryption.js";

export const sendEmail = async ({ doctorId, to, subject, html }) => {
  try {
    const doctor = await Doctor.findById(doctorId).lean();
    if (!doctor || !doctor.smtpPassword) {
      throw new Error("SMTP credentials not set for this doctor");
    }

    // 🔓 Decrypt stored password
    const decryptedPassword = decrypt(doctor.smtpPassword);

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: doctor.email,   // doctor’s Gmail
        pass: decryptedPassword, // decrypted App Password
      },
    });

    await transporter.sendMail({
      from: doctor.email,
      to,
      subject,
      html,
    });

    console.log("✅ Email sent to:", to);
  } catch (error) {
    console.error("❌ Email send failed:", error.message);
    throw error;
  }
};
export default sendEmail;
