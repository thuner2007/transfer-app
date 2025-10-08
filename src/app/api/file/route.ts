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
    if (files.length === 0) {
      return Response.json({ error: "No files uploaded" }, { status: 400 });
    }

    // First create the download url
    const collectionUuid = randomUUID();

    const downloadUrl =
      process.env.DOWNLOAD_SERVICE_URL + "download/" + collectionUuid;

    await prismaService.collection.create({
      data: {
        id: collectionUuid,
        downloadlink: downloadUrl,
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
    }

    return Response.json({
      message: "Files uploaded successfully",
      files,
    });
  } catch (error) {
    console.error("File upload error:", error);
    return Response.json({ error: "Failed to upload files" }, { status: 500 });
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
