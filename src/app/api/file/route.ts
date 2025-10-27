import { randomUUID } from "crypto";
import { MinioService } from "../../../minio.service";
import { PrismaClient } from "../../../generated/prisma";

const minioService = new MinioService();
const prismaService = new PrismaClient();

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    console.log("=== FORM DATA DEBUG ===");
    for (const [key, value] of formData.entries()) {
      if (
        value &&
        typeof value === "object" &&
        "name" in value &&
        "size" in value
      ) {
        const fileValue = value as { name: string; size: number; type: string };
        console.log(
          `${key}: [File] name="${fileValue.name}", size=${fileValue.size}, type="${fileValue.type}"`
        );
      } else {
        console.log(`${key}: "${value}"`);
      }
    }
    console.log("=== END FORM DATA DEBUG ===");

    const isChunked = formData.get("isChunked") === "true";
    const fileId = formData.get("fileId") as string | null;
    const chunkNumber = formData.get("chunkNumber") as string | null;
    const totalChunks = formData.get("totalChunks") as string | null;
    const originalFileName = formData.get("originalFileName") as string | null;
    const totalSize = formData.get("totalSize") as string | null;
    const mimeType = formData.get("mimeType") as string | null;

    console.log(
      `POST /api/file - isChunked: ${isChunked}, fileId: ${fileId}, chunkNumber: ${chunkNumber}`
    );

    if (isChunked) {
      console.log(
        `All chunked params - fileId: ${fileId}, chunkNumber: ${chunkNumber}, totalChunks: ${totalChunks}, fileName: ${originalFileName}, totalSize: ${totalSize}, mimeType: ${mimeType}`
      );
    }

    if (
      isChunked &&
      fileId &&
      chunkNumber !== null &&
      totalChunks &&
      originalFileName &&
      totalSize &&
      mimeType !== null
    ) {
      const parsedChunkNumber = parseInt(chunkNumber);
      const parsedTotalChunks = parseInt(totalChunks);
      const parsedTotalSize = parseInt(totalSize);

      if (
        isNaN(parsedChunkNumber) ||
        isNaN(parsedTotalChunks) ||
        isNaN(parsedTotalSize)
      ) {
        console.error(
          `Invalid numeric parameters - chunkNumber: "${chunkNumber}" (${parsedChunkNumber}), totalChunks: "${totalChunks}" (${parsedTotalChunks}), totalSize: "${totalSize}" (${parsedTotalSize})`
        );
        return Response.json(
          { error: `Invalid numeric parameters in chunked upload` },
          { status: 400 }
        );
      }

      console.log(
        `Validation passed - proceeding with chunked upload for file: "${originalFileName}"`
      );

      return await handleChunkedUpload(
        formData,
        fileId,
        parsedChunkNumber,
        parsedTotalChunks,
        originalFileName,
        parsedTotalSize,
        mimeType
      );
    } else if (isChunked) {
      // Log which parameters are missing for chunked upload
      const missingParams = [];
      if (!fileId) missingParams.push("fileId");
      if (chunkNumber === null) missingParams.push("chunkNumber");
      if (!totalChunks) missingParams.push("totalChunks");
      if (!originalFileName) missingParams.push("originalFileName");
      if (!totalSize) missingParams.push("totalSize");
      if (mimeType === null) missingParams.push("mimeType");

      console.error(
        `Chunked upload missing required parameters: ${missingParams.join(
          ", "
        )}`
      );
      console.error("Form data keys present:", Array.from(formData.keys()));

      return Response.json(
        {
          error: `Missing required parameters for chunked upload: ${missingParams.join(
            ", "
          )}`,
        },
        { status: 400 }
      );
    }

    const files = formData.getAll("files");
    const creator = formData.get("creator") as string | null;
    const password = formData.get("password") as string | null;
    const expirationTime = formData.get("expirationTime") as string | null;
    const wantsToGetNotified = formData.get("wantsToGetNotified") === "true";

    if (files.length === 0) {
      return Response.json({ error: "No files uploaded" }, { status: 400 });
    }

    const collectionUuid = randomUUID();

    // Create the download url
    const downloadUrl =
      process.env.DOWNLOAD_SERVICE_URL + "d/" + collectionUuid;

    // Save collection metadata to database
    await prismaService.collection.create({
      data: {
        id: collectionUuid,
        downloadlink: downloadUrl,
        creator: creator || "anonymous",
        fileCount: files.length,
        wantsToGetNotified: wantsToGetNotified,
        filesSize: BigInt(
          files.reduce((total, file) => {
            if (typeof file === "string") return total;
            return total + (file as File).size;
          }, 0)
        ),
        password: password || null,
        hasPassword: !!password,
        expirationTime: expirationTime
          ? new Date(expirationTime)
          : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // Default 3 days
      },
    });

    // Create bucket
    await minioService.createBucketIfNotExists(collectionUuid, false);

    // Then upload files
    for (const file of files) {
      if (typeof file === "string") {
        continue;
      }

      console.log("Uploading file:", file.name);

      await minioService.uploadFile(collectionUuid, file);
      await prismaService.file.create({
        data: {
          filename: file.name,
          mimetype: file.type,
          size: BigInt(file.size),
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    return Response.json(
      {
        error: "Failed to upload files",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

// Function to get MIME type from file extension if not provided
function getMimeTypeFromExtension(
  fileName: string,
  providedMimeType: string
): string {
  if (providedMimeType && providedMimeType.trim() !== "") {
    return providedMimeType;
  }

  const extension = fileName.toLowerCase().split(".").pop();
  const mimeTypeMap: { [key: string]: string } = {
    gcode: "text/plain",
    txt: "text/plain",
    pdf: "application/pdf",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    mp4: "video/mp4",
    avi: "video/avi",
    mov: "video/quicktime",
    zip: "application/zip",
    rar: "application/x-rar-compressed",
    "7z": "application/x-7z-compressed",
  };

  return mimeTypeMap[extension || ""] || "application/octet-stream";
}

async function handleChunkedUpload(
  formData: FormData,
  fileId: string,
  chunkNumber: number,
  totalChunks: number,
  originalFileName: string,
  totalSize: number,
  mimeType: string
): Promise<Response> {
  try {
    // Ensure it is a valid MIME type
    const finalMimeType = getMimeTypeFromExtension(originalFileName, mimeType);
    console.log(
      `Original mimeType: "${mimeType}", final mimeType: "${finalMimeType}" for file: ${originalFileName}`
    );
    const chunk = formData.get("chunk") as File | null;
    const creator = formData.get("creator") as string | null;
    const password = formData.get("password") as string | null;
    const expirationTime = formData.get("expirationTime") as string | null;
    const collectionId = formData.get("collectionId") as string | null;
    const wantsToGetNotified = formData.get("wantsToGetNotified") === "true";

    console.log(
      `Chunked upload request: fileId=${fileId}, chunkNumber=${chunkNumber}, totalChunks=${totalChunks}, collectionId=${collectionId}, fileName=${originalFileName}`
    );

    if (!chunk) {
      console.error(
        `No chunk data received for fileId=${fileId}, chunkNumber=${chunkNumber}`
      );
      return Response.json(
        { error: "No chunk data received" },
        { status: 400 }
      );
    }

    console.log(
      `Chunk size: ${chunk.size} bytes, type: ${chunk.type}, name: ${chunk.name}`
    );

    let collectionUuid: string;
    let downloadUrl: string | undefined;

    if (!collectionId) {
      // Create a new collection for first chunk of first file
      collectionUuid = randomUUID();
      downloadUrl = process.env.DOWNLOAD_SERVICE_URL + "d/" + collectionUuid;

      await prismaService.collection.create({
        data: {
          id: collectionUuid,
          downloadlink: downloadUrl,
          creator: creator || "anonymous",
          fileCount: 0,
          filesSize: BigInt(0),
          password: password || null,
          hasPassword: !!password,
          wantsToGetNotified: wantsToGetNotified,
          expirationTime: expirationTime
            ? new Date(expirationTime)
            : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        },
      });

      await minioService.createBucketIfNotExists(collectionUuid, false);
    } else {
      collectionUuid = collectionId;
      // Get the download URL from existing collection
      const collection = await prismaService.collection.findUnique({
        where: { id: collectionId },
      });
      downloadUrl = collection?.downloadlink || undefined;
    }

    // Check if this chunk already exists (for retry scenarios)
    const chunkExists = await minioService.checkChunkExists(
      collectionUuid,
      fileId,
      chunkNumber
    );

    if (!chunkExists) {
      // Upload the chunk
      const chunkBuffer = Buffer.from(await chunk.arrayBuffer());
      await minioService.uploadChunk(
        collectionUuid,
        fileId,
        chunkNumber,
        chunkBuffer,
        originalFileName,
        finalMimeType
      );
    }

    // Check if all chunks have been uploaded
    const uploadedChunks = await minioService.getUploadedChunks(
      collectionUuid,
      fileId
    );
    const allChunksUploaded = uploadedChunks.length === totalChunks;

    if (allChunksUploaded) {
      // Merge chunks and create final file
      const mergedFile = await minioService.mergeChunks(
        collectionUuid,
        fileId,
        totalChunks,
        originalFileName,
        finalMimeType,
        totalSize
      );

      // Add file to database
      await prismaService.file.create({
        data: {
          filename: mergedFile.fileName,
          mimetype: mergedFile.mimetype,
          size: BigInt(mergedFile.size),
          collection: {
            connect: {
              id: collectionUuid,
            },
          },
        },
      });

      // Update collection metadata
      await prismaService.collection.update({
        where: {
          id: collectionUuid,
        },
        data: {
          fileCount: {
            increment: 1,
          },
          filesSize: {
            increment: BigInt(mergedFile.size),
          },
        },
      });

      return Response.json({
        message: "File upload completed",
        fileComplete: true,
        downloadUrl: downloadUrl,
        fileName: mergedFile.fileName,
        collectionId: collectionUuid,
      });
    } else {
      // Return progress information
      return Response.json({
        message: "Chunk uploaded successfully",
        fileComplete: false,
        chunkNumber,
        totalChunks,
        uploadedChunks: uploadedChunks.length,
        collectionId: collectionUuid,
      });
    }
  } catch (error) {
    console.error(
      `Chunked upload error for fileId=${fileId}, chunkNumber=${chunkNumber}:`,
      error
    );
    const errorMessage = error instanceof Error ? error.message : String(error);
    return Response.json(
      {
        error: "Failed to upload chunk",
        details: errorMessage,
        fileId,
        chunkNumber,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const collectionId = url.searchParams.get("collectionId");

  if (!collectionId) {
    return new Response("Collection ID is required", { status: 400 });
  }

  try {
    console.log(`Starting zip download for collection: ${collectionId}`);

    const zipStream = await minioService.downloadAllFilesAsZip(collectionId);

    if (!zipStream) {
      return new Response("Collection not found", { status: 404 });
    }

    const collection = await prismaService.collection.findUnique({
      where: { id: collectionId },
      select: { creator: true, createdAt: true },
    });

    const timestamp = collection?.createdAt
      ? new Date(collection.createdAt).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];

    const creator = collection?.creator || "anonymous";
    const filename = `${creator}-${timestamp}-${collectionId.substring(
      0,
      8
    )}.zip`;

    console.log("received zip stream: " + !!zipStream);

    // Convert Node.js readable stream to Web ReadableStream for better browser compatibility
    const readableStream = new ReadableStream({
      start(controller) {
        zipStream.on("data", (chunk: Buffer) => {
          controller.enqueue(new Uint8Array(chunk));
        });

        zipStream.on("end", () => {
          controller.close();
        });

        zipStream.on("error", (error) => {
          console.error("Zip stream error:", error);
          controller.error(error);
        });
      },
    });

    return new Response(readableStream, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache",
        "Transfer-Encoding": "chunked",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("Download error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    return new Response(`Failed to download files: ${errorMessage}`, {
      status: 500,
    });
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
