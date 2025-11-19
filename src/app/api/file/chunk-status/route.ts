import { MinioService } from "../../../../minio.service";

const minioService = new MinioService();

export async function GET(request: Request) {
  const url = new URL(request.url);
  const collectionId = url.searchParams.get("collectionId");
  const fileId = url.searchParams.get("fileId");

  if (!collectionId || !fileId) {
    return Response.json(
      { error: "collectionId and fileId are required" },
      { status: 400 }
    );
  }

  try {
    // Get uploaded chunks from MinIO
    const uploadedChunks = await minioService.getUploadedChunks(
      collectionId,
      fileId
    );

    return Response.json({
      uploadedChunks,
      totalUploaded: uploadedChunks.length,
    });
  } catch (error) {
    console.error("Error getting chunk status:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    return Response.json(
      {
        error: "Failed to get chunk status",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
