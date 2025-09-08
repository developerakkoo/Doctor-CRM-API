import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const sendVoiceCall = async (to, message) => {
  try {
    const call = await client.calls.create({
      twiml: `<Response><Say voice="alice">${message}</Say></Response>`,
      to,
      from: process.env.TWILIO_PHONE_NUMBER,
    });

    console.log("📞 Voice call initiated:", call.sid);
    return { success: true, sid: call.sid };
  } catch (err) {
    console.error("❌ Voice call error:", err.message);
    return { success: false, error: err.message };
  }
};

export default sendVoiceCall;