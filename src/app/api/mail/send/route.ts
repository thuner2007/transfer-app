import { PrismaClient } from "../../../../generated/prisma";
import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
// Import cleanup service to auto-start it
import "../../../../cleanup-service";

const prismaService = new PrismaClient();

const sendMail = async (
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Check if a verification entry already exists for this email
    const existingEntry = await prismaService.verification.findUnique({
      where: { email: email },
    });

    if (existingEntry) {
      // If entry exists and verified, return status
      if (existingEntry.verified) {
        return NextResponse.json({ verifyStatus: "verified" }, { status: 200 });
      }
      // If entry exists but not verified, return status
      // Update the existing entry with a new code and validity
      await prismaService.verification.update({
        where: { email: email },
        data: {
          code: Math.floor(100000 + Math.random() * 900000), // Generate a new 6-digit code
          validUntil: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
        },
      });

      // Send verification email
      sendMail(
        email,
        "Your Verification Code",
        `Your code is ${existingEntry.code}`,
        `<h1>Your Verification Code</h1><p>Your code is <b>${existingEntry.code}</b></p><p>This code is valid for 15 minutes.</p>`
      ).catch((error) => {
        console.error("Error sending email:", error);
      });

      console.log("Resent verification email to:", email);

      return NextResponse.json({ verifyStatus: "pending" }, { status: 200 });
    }

    // Create verification entry in the database
    const verificationEntry = await prismaService.verification.create({
      data: {
        email: email,
        verified: false,
        code: Math.floor(100000 + Math.random() * 900000), // Generate a 6-digit code
        validUntil: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
      },
    });

    console.log("Sending verification email to:", email);

    // Send verification email
    sendMail(
      email,
      "Your Verification Code",
      `Your code is ${verificationEntry.code}`,
      `<h1>Your Verification Code</h1><p>Your code is <b>${verificationEntry.code}</b></p><p>This code is valid for 15 minutes.</p>`
    ).catch((error) => {
      console.error("Error sending email:", error);
    });

    console.log("Verification email sent to:", email);

    return NextResponse.json({ verifyStatus: "pending" }, { status: 200 });
  } catch (error) {
    console.error("Error sending verification email:", error);
    return NextResponse.json(
      { error: "Failed to send verification email" },
      { status: 500 }
    );
  }
}
