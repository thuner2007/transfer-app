import { prisma } from "../../../../lib/PrismaClient";

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const collectionId = url.searchParams.get("collectionId");

    if (!collectionId) {
      return new Response("Collection ID is required", { status: 400 });
    }

    const hasPassword = await prisma.collection.findUnique({
      where: { id: collectionId },
      select: { hasPassword: true },
    });

    if (hasPassword === null) {
      return new Response("Collection not found", { status: 404 });
    }

    return new Response(
      JSON.stringify({ hasPassword: hasPassword.hasPassword }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error checking password requirement:", error);
    return new Response("Failed to check password requirement", {
      status: 500,
    });
  }
}
