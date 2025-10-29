import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "../../../../generated/prisma";

const prismaService = new PrismaClient();

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { code, email } = body;

  const verificationEntry = await prismaService.verification.findUnique({
    where: { email: email },
  });

  if (!verificationEntry) {
    return new Response("Verification entry not found", { status: 404 });
  }

  if (verificationEntry.code === code) {
    await prismaService.verification.update({
      where: { email: email },
      data: {
        verified: true,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      },
    });
    return NextResponse.json({ verifyStatus: "success" }, { status: 200 });
  }

  if (verificationEntry.code !== code) {
    return NextResponse.json(
      { verifyStatus: "invalid_code" },
      { status: 400 }
    );
  }

  return new Response("Email verification failed", { status: 400 });
}
