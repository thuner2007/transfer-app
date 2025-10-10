import { randomUUID } from "crypto";
import { MinioService } from "../../../minio.service";
import { PrismaClient } from "../../../generated/prisma";

const minioService = new MinioService();
const prismaService = new PrismaClient();

export async function POST(request: Request) {
  try {
    // Parse form data for file uploads
    const formData = await request.formData();
    const files = formData.getAll("files");
    const creator = formData.get("creator") as string | null;
    const password = formData.get("password") as string | null;
    if (files.length === 0) {
      return Response.json({ error: "No files uploaded" }, { status: 400 });
    }

    // First create the download url
    const collectionUuid = randomUUID();

    const downloadUrl =
      process.env.DOWNLOAD_SERVICE_URL + "d/" + collectionUuid;

    // Save collection metadata to database
    await prismaService.collection.create({
      data: {
        id: collectionUuid,
        downloadlink: downloadUrl,
        creator: creator || "anonymous",
        fileCount: files.length,
        filesSize: files.reduce((total, file) => {
          if (typeof file === "string") return total;
          return total + (file as File).size;
        }, 0),
        password: password || null,
        hasPassword: !!password,
      },
    });

    // Handle file upload logic here
    // First create bucket
    await minioService.createBucketIfNotExists(collectionUuid, false);

    // Then upload files
    for (const file of files) {
      if (typeof file === "string") {
        continue; // Skip non-file entries
      }
      await minioService.uploadFile(collectionUuid, file);
      await prismaService.file.create({
        data: {
          filename: file.name,
          mimetype: file.type,
          size: file.size,
          collection: {
            connect: {
              id: collectionUuid,
            },
          },
        },
      });
    }

    return Response.json({
      message: "Files uploaded successfully",
      downloadUrl: downloadUrl,
    });
  } catch (error) {
    console.error("File upload error:", error);
    return Response.json({ error: "Failed to upload files" }, { status: 500 });
  }
}

// Downloads all files from bucket
export async function GET(request: Request) {
  const url = new URL(request.url);
  const collectionId = url.searchParams.get("collectionId");

  if (!collectionId) {
    return new Response("Collection ID is required", { status: 400 });
  }

  try {
    const zipStream = await minioService.downloadAllFilesAsZip(collectionId);

    if (!zipStream) {
      return new Response("Collection not found", { status: 404 });
    }

    return new Response(zipStream as unknown as ReadableStream<unknown>, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${collectionId}.zip"`,
      },
    });
  } catch (error) {
    console.error("Download error:", error);
    return new Response("Failed to download files", { status: 500 });
  }
}

// Delete all buckets (Just for testing purposes)
export async function DELETE() {
  try {
    await minioService.deleteAllBuckets();
  } catch (error) {
    console.error("Error deleting all buckets:", error);
    return Response.json(
      { error: "Failed to delete all buckets" },
      { status: 500 }
    );
  }
}
