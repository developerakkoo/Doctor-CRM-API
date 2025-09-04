import { google } from "googleapis";
import { decrypt } from "./cryptoHelper.js"; // adjust path if needed

function makeEmail(to, from, subject, messageHtml) {
  const str = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
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
    if (!doctor || !doctor.oauthRefreshToken) {
      return { success: false, error: "Doctor Gmail not connected" };
    }

    if (!to || typeof to !== "string" || !to.includes("@")) {
      return { success: false, error: `Invalid recipient email: ${to}` };
    }

    const refreshToken = decrypt(doctor.oauthRefreshToken);
    if (!refreshToken.startsWith("1//")) {
      return { success: false, error: "Invalid refresh token in DB" };
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({ refresh_token: refreshToken });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const raw = makeEmail(to.trim(), doctor.email, subject, html);

    const res = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw },
    });

    console.log("📩 Gmail API send result:", res.data);
    return { success: true, result: res.data };
  } catch (err) {
    console.error("❌ Error in sendDoctorMail:", err.response?.data || err.message);
    return { success: false, error: err.message };
  }
};

export default sendDoctorMail;