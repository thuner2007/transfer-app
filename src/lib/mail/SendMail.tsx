import nodemailer from "nodemailer";

export const sendMail = async (
  to: string,
  subject: string,
  text: string,
  html: string
) => {
  // Create transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "465"),
    secure: true, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  // Send email
  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: to,
    subject: subject,
    text: text,
    html: html,
  });
};
