import nodemailer from "nodemailer";
import { google } from "googleapis";
import { decrypt } from "./cryptoHelper.js";

const sendDoctorMail = async (doctor, subject, html) => {
  try {
    if (!doctor || !doctor.oauthRefreshToken) {
      return { success: false, error: "Doctor Gmail not connected" };
    }

    // ✅ Step 1: Decrypt stored refresh token
    const decryptedRefreshToken = decrypt(doctor.oauthRefreshToken);
    console.log("🔓 Decrypted refresh token (partial):", decryptedRefreshToken.slice(0, 10) + "...");

    // ✅ Step 2: Setup Google OAuth2 Client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      refresh_token: decryptedRefreshToken,
    });

    // ✅ Step 3: Get fresh access token
    const accessTokenResponse = await oauth2Client.getAccessToken();
    const accessToken = accessTokenResponse?.token;
    if (!accessToken) {
      throw new Error("Failed to get access token from Google");
    }

    // ✅ Step 4: Setup Nodemailer Transport
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: doctor.email, // 👈 must match the connected Gmail
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: decryptedRefreshToken,
        accessToken,
      },
    });

    // ✅ Step 5: Send the email
    const mailOptions = {
      from: `"${doctor.title} ${doctor.name}" <${doctor.email}>`,
      to: doctor.email, // 👈 send to doctor
      subject,
      html,
    };

    await transporter.sendMail(mailOptions);
    console.log(`📨 Email sent successfully to ${doctor.email}`);

    return { success: true };
  } catch (error) {
    console.error("❌ Error in sendDoctorMail:", error);
    return { success: false, error: error.message };
  }
};

export default sendDoctorMail;
