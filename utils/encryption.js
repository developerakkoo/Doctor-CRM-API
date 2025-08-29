import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config(); // load .env

// Ensure we have the secret key
if (!process.env.SMTP_SECRET_KEY) {
  throw new Error("❌ Missing SMTP_SECRET_KEY in environment variables");
}

// Guarantee 32 bytes for AES-256
const ENCRYPTION_KEY = process.env.SMTP_SECRET_KEY.padEnd(32, "x");
const IV_LENGTH = 16;

// Encrypt
export const encrypt = (text) => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY),
    iv
  );
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
};

// Decrypt
export const decrypt = (encryptedText) => {
  const [ivHex, encrypted] = encryptedText.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY),
    iv
  );
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
};
