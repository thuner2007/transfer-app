import { PrismaClient } from "../../../../generated/prisma";
import { MinioService } from "../../../../minio.service";

const minioService = new MinioService();
const prismaService = new PrismaClient();

export async function GET(request: Request) {
  const url = new URL(request.url);
  const collectionId = url.searchParams.get("collectionId");
  const filename = url.searchParams.get("filename");
  if (!collectionId || !filename) {
    return new Response("Collection ID and filename are required", {
      status: 400,
    });
  }

  const collectionEntry = await prismaService.collection.findUnique({
    where: { id: collectionId },
    include: { files: true },
  });

  if (!collectionEntry) {
    return new Response("Collection not found", { status: 404 });
  }

  const fileEntry = collectionEntry.files.find(
    (file) => file.filename === filename
  );
  if (!fileEntry) {
    return new Response("File entry not found in the specified collection", {
      status: 404,
    });
  }

  try {
    const fileStream = await minioService.downloadFile(collectionId, filename);
    if (!fileStream) {
      return new Response("File not found in storage", { status: 404 });
    }

    return new Response(fileStream as unknown as ReadableStream<unknown>, {
      status: 200,
      headers: {
        "Content-Type": fileEntry.mimetype,
        "Content-Disposition": `attachment; filename="${fileEntry.filename}"`,
      },
    });
  } catch (error) {
    console.error("File download error:", error);
    return new Response("Failed to download file", { status: 500 });
  }
}
