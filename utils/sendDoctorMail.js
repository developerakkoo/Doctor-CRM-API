// utils/sendDoctorMail.js
import { google } from "googleapis";
import { decrypt } from "./cryptoHelper.js"; // adjust path if needed

function makeEmail(to, from, subject, messageHtml) {
  const str = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
    "",
    messageHtml,
  ].join("\n");

  return Buffer.from(str)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

const sendDoctorMail = async (doctor, to, subject, html) => {
  try {
    // ✅ Validate doctor & refresh token
    if (!doctor || !doctor.oauthRefreshToken) {
      return { success: false, error: "Doctor Gmail not connected" };
    }

    // ✅ Validate recipient email
    if (!to || typeof to !== "string" || !to.includes("@")) {
      return { success: false, error: `Invalid recipient email: ${to}` };
    }

    // ✅ Decrypt refresh token
    const refreshToken = decrypt(doctor.oauthRefreshToken);
    if (!refreshToken || !refreshToken.startsWith("1//")) {
      return { success: false, error: "Invalid refresh token in DB" };
    }

    // ✅ Setup OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    // ✅ Setup Gmail API
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    // ✅ Construct email
    const raw = makeEmail(to.trim(), doctor.email, subject, html);

    // ✅ Send email
    const response = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw },
    });

    console.log("📩 Gmail API send result:", response.data.id);
    return { success: true, result: response.data };
  } catch (err) {
    console.error("❌ Error in sendDoctorMail:", err.response?.data || err.message);
    return { success: false, error: err.message };
  }
};

export default sendDoctorMail;
