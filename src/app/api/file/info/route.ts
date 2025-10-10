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
    return new Response("Collection not found", { status: 404 });
  }

  // Remove password from the response
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, ...collectionWithoutPassword } = collectionEntry;

  return new Response(JSON.stringify(collectionWithoutPassword), {
    status: 200,
  });
}
