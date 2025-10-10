import { PrismaClient } from "../../../../generated/prisma";

const prismaService = new PrismaClient();

export async function GET(request: Request) {
  const url = new URL(request.url);
  const collectionId = url.searchParams.get("collectionId");

  if (!collectionId) {
    return new Response("Collection ID is required", { status: 400 });
  }

  const collectionEntry = await prismaService.collection.findUnique({
    where: { id: collectionId },
    include: { files: true },
  });

  if (!collectionEntry) {
    return new Response("File entry not found", { status: 404 });
  }

  return new Response(JSON.stringify(collectionEntry), { status: 200 });
}
