import nodemailer from "nodemailer";
import { google } from "googleapis";
import { decrypt } from "./cryptoHelper.js";

const sendEmail = async ({ doctor, to, subject, html }) => {
  try {
    // if (!doctor?.oauthRefreshToken) {
    //   throw new Error("Doctor does not have OAuth refresh token saved.");
    // }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      refresh_token: decrypt(doctor.oauthRefreshToken),
    });

    const accessTokenResponse = await oauth2Client.getAccessToken();
    const accessToken = accessTokenResponse?.token;

    if (!accessToken) {
      throw new Error("Failed to generate access token from refresh token");
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: doctor.email, // sender = doctor
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: decrypt(doctor.oauthRefreshToken),
        accessToken,
      },
    });

    await transporter.sendMail({
      from: `"Dr. ${doctor.name}" <${doctor.email}>`,
      to,
      subject,
      html,
    });

    return { success: true };
  } catch (error) {
    console.error("❌ Error in sendEmail:", error.message);
    return { success: false, error: error.message };
  }
};

export default sendEmail;