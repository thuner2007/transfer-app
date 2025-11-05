import { prisma } from "../../../../lib/PrismaClient";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const collectionId = url.searchParams.get("collectionId");

  if (!collectionId) {
    return new Response("Collection ID is required", { status: 400 });
  }

  const collectionEntry = await prisma.collection.findUnique({
    where: { id: collectionId },
    include: { files: true },
  });

  if (!collectionEntry) {
    return new Response("Collection not found", { status: 404 });
  }

  const { ...collectionWithoutPassword } = collectionEntry;

  const serializedCollection = JSON.parse(
    JSON.stringify(collectionWithoutPassword, (key, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );

  return new Response(JSON.stringify(serializedCollection), {
    status: 200,
  });
}
