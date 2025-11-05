import { NextRequest } from "next/server";
import { sendMail } from "../../../../lib/mail/SendMail";
import { prisma } from "../../../../lib/PrismaClient";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { collectionId } = body;

  // Find the collection in the database
  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
  });

  if (!collection) {
    return new Response("Collection not found", { status: 404 });
  }

  // Only send notification email when the uploader activated it
  if (!collection.wantsToGetNotified) {
    return new Response("Notification not enabled", { status: 200 });
  }

  sendMail(
    collection.creator,
    "Your file has been downloaded",
    `Your file on CWX-Transfer has been downloaded.`,
    `<h1>Your file has been downloaded</h1><p>Your file <a href="${collection.downloadlink}">here</a>
     has been downloaded.</p>`
  ).catch((error) => {
    console.error("Error sending email:", error);
  });

  return new Response("Notification sent", { status: 200 });
}
