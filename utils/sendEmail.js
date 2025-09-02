import nodemailer from "nodemailer";
import { google } from "googleapis";
import { decrypt } from "./cryptoHelper.js";

const sendDoctorMail = async (doctor, subject, text) => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    refresh_token: decrypt(doctor.oauthRefreshToken),
  });

  const { token } = await oauth2Client.getAccessToken();

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: doctor.email,
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      refreshToken: decrypt(doctor.oauthRefreshToken),
      accessToken: token,
    },
  });

  await transporter.sendMail({
    from: doctor.email,
    to: doctor.email, // you can adjust recipient here
    subject,
    text,
  });
};

// ✅ Fix: export the actual function name
export default sendDoctorMail;