import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const sendEmail = async ({ to, subject, text, html }) => {
  if (!to) {
    throw new Error('No recipients defined');
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  const mailOptions = {
    from: `"Doctor CRM" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    ...(text && { text }),
    ...(html && { html })
  };

  const info = await transporter.sendMail(mailOptions);
  console.log('📧 Email sent:', info.messageId);
};

export default sendEmail;
