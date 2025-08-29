import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

/**
 * Send email using either:
 *  - Doctor's Gmail + App Password (if provided)
 *  - System Gmail (from .env) as fallback
 */
const sendEmail = async ({ 
  fromEmail, 
  fromPass, 
  to, 
  subject, 
  text, 
  html 
}) => {
  if (!to) {
    throw new Error("No recipients defined");
  }

  // ✅ Use doctor's Gmail if provided, otherwise fallback to system account
  const emailUser = fromEmail || process.env.EMAIL_USER;
  const emailPass = fromPass || process.env.EMAIL_PASS;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });

  const mailOptions = {
    from: `"Doctor CRM" <${emailUser}>`,
    to,
    subject,
    ...(text && { text }),
    ...(html && { html }),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("📧 Email sent:", info.messageId);
    return { success: true, messageId: info.messageId, sentFrom: emailUser };
  } catch (err) {
    console.error("❌ Email send failed:", err.message);
    return { success: false, error: err.message };
  }
};

export default sendEmail;