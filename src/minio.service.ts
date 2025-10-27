import * as Minio from "minio";
import archiver from "archiver";
import { PassThrough } from "stream";

export class MinioService {
  private minioClient: Minio.Client;

  constructor() {
    this.minioClient = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT || "transfer-app-minio",
      port: parseInt(process.env.MINIO_PORT || "9000", 10),
      useSSL: process.env.MINIO_USE_SSL === "true",
      accessKey: process.env.MINIO_ROOT_USER || "",
      secretKey: process.env.MINIO_ROOT_PASSWORD || "",
      region: "eu-central-1",
      pathStyle: true,
    });
  }

  async createBucketIfNotExists(
    bucketName: string,
    isPublic: boolean = false
  ): Promise<void> {
    try {
      const exists = await this.minioClient.bucketExists(bucketName);
      if (!exists) {
        console.log(`Creating bucket: ${bucketName}`);

        // Create the bucket
        await this.minioClient.makeBucket(bucketName);
        console.log(`Bucket ${bucketName} created successfully`);

        if (isPublic) {
          await this.makeBucketPublic(bucketName);
        }
      } else {
        console.log(`Bucket ${bucketName} already exists`);
        // If bucket exists but needs to be public, update its policy
        if (isPublic) {
          await this.makeBucketPublic(bucketName);
        }
      }
    } catch (error) {
      console.error("Error creating/checking bucket:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create/verify bucket: ${errorMessage}`);
    }
  }

  async makeBucketPublic(bucketName: string): Promise<void> {
    try {
      console.log(`Setting bucket ${bucketName} to public`);

      // Policy that allows public read access to all objects in the bucket
      const policy = {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: { AWS: ["*"] },
            Action: ["s3:GetObject", "s3:ListBucket"],
            Resource: [
              `arn:aws:s3:::${bucketName}/*`,
              `arn:aws:s3:::${bucketName}`,
            ],
          },
        ],
      };

      await this.minioClient.setBucketPolicy(
        bucketName,
        JSON.stringify(policy)
      );
      console.log(`Bucket ${bucketName} set to public successfully`);
    } catch (error) {
      console.error(`Failed to make bucket ${bucketName} public:`, error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to set bucket policy: ${errorMessage}`);
    }
  }

  async downloadAllFilesAsZip(
    bucketName: string
  ): Promise<NodeJS.ReadableStream | null> {
    try {
      const exists = await this.minioClient.bucketExists(bucketName);
      if (!exists) {
        console.log(`Bucket ${bucketName} does not exist`);
        return null;
      }

      // Use memory-efficient archiver configuration
      const archive = archiver("zip", {
        zlib: { level: 1 }, // Set compression level
        store: false,
        forceLocalTime: true,
        statConcurrency: 10, // Process multiple files concurrently
        allowHalfOpen: false,
        highWaterMark: 1024 * 1024, // 1MB buffer size for streams
      });

      // Handle archive errors
      archive.on("error", (err) => {
        console.error("Archive error:", err);
        throw err;
      });

      // Handle archive warnings
      archive.on("warning", (err) => {
        if (err.code === "ENOENT") {
          console.warn("Archive warning:", err);
        } else {
          throw err;
        }
      });

      setImmediate(async () => {
        try {
          // List all objects in the bucket
          const objectsStream = this.minioClient.listObjectsV2(
            bucketName,
            "",
            true
          );

          const files: Array<{ name: string; size?: number }> = [];
          for await (const obj of objectsStream) {
            files.push({ name: obj.name, size: obj.size });
          }

          console.log(`Creating zip with ${files.length} files`);

          // Process multiple files concurrently
          const concurrencyLimit = 10; // Process 10 files at once
          const processingPromises: Promise<void>[] = [];

          for (let i = 0; i < files.length; i += concurrencyLimit) {
            const batch = files.slice(i, i + concurrencyLimit);

            const batchPromise = Promise.all(
              batch.map(async (file, index) => {
                try {
                  const actualIndex = i + index + 1;
                  console.log(
                    `Adding file ${actualIndex}/${files.length}: ${file.name}`
                  );

                  const objectStream = await this.minioClient.getObject(
                    bucketName,
                    file.name
                  );

                  // Use store mode for large files
                  const shouldStore = !!(file.size && file.size > 5 * 1024 * 1024); // 5MB

                  archive.append(objectStream, {
                    name: file.name,
                    store: shouldStore,
                  });
                } catch (fileError) {
                  console.error(
                    `Error processing file ${file.name}:`,
                    fileError
                  );
                  // Continue with other files
                }
              })
            ).then(() => {});

            processingPromises.push(batchPromise);

            // Wait for current batch before starting next (to control memory usage)
            await batchPromise;
          }

          console.log("Finalizing zip archive");
          archive.finalize();
        } catch (error) {
          console.error("Error in file processing:", error);
          archive.emit("error", error);
        }
      });

      return archive;
    } catch (error) {
      console.error("Error downloading files as zip:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to download files: ${errorMessage}`);
    }
  }

  async deleteBucket(bucketName: string): Promise<void> {
    try {
      const exists = await this.minioClient.bucketExists(bucketName);
      if (exists) {
        // First, remove all objects from the bucket
        const objectsStream = this.minioClient.listObjectsV2(
          bucketName,
          "",
          true
        );
        const objectsToDelete: string[] = [];
        for await (const obj of objectsStream) {
          objectsToDelete.push(obj.name);
        }
        if (objectsToDelete.length > 0) {
          await this.minioClient.removeObjects(bucketName, objectsToDelete);
        }

        // Now delete the bucket
        await this.minioClient.removeBucket(bucketName);
        console.log(`Bucket ${bucketName} deleted successfully`);
      } else {
        console.log(`Bucket ${bucketName} does not exist`);
      }
    } catch (error) {
      console.error("Error deleting bucket:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to delete bucket: ${errorMessage}`);
    }
  }

  // Just for testing purposes
  async deleteAllBuckets(): Promise<void> {
    try {
      const buckets = await this.minioClient.listBuckets();
      for (const bucket of buckets) {
        await this.deleteBucket(bucket.name);
      }
      console.log("All buckets deleted successfully");
    } catch (error) {
      console.error("Error deleting all buckets:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to delete all buckets: ${errorMessage}`);
    }
  }

  async downloadFile(
    bucketName: string,
    fileName: string
  ): Promise<NodeJS.ReadableStream | null> {
    try {
      const exists = await this.minioClient.bucketExists(bucketName);
      if (!exists) {
        console.log(`Bucket ${bucketName} does not exist`);
        return null;
      }

      // Get the file stream
      const fileStream = await this.minioClient.getObject(bucketName, fileName);
      return fileStream;
    } catch (error) {
      console.error("Error downloading file:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to download file: ${errorMessage}`);
    }
  }

  async uploadFile(
    bucketName: string,
    file: File
  ): Promise<{
    fileName: string;
    size: number;
    mimetype: string;
  }> {
    const buffer = Buffer.from(await file.arrayBuffer());

    // Extract folder structure from file name if it contains "/"
    let objectKey = file.name;
    let actualFileName = file.name;

    if (file.name.includes("/")) {
      // Get folder path from file name (for example: "folder1/folder2/file.txt" -> "folder1/folder2")
      const folderPath = file.name.substring(0, file.name.lastIndexOf("/"));
      // Get actual file name (for example: "folder1/folder2/file.txt" -> "file.txt")
      actualFileName = file.name.substring(file.name.lastIndexOf("/") + 1);

      // Split folder path and clean each part
      const folderParts = folderPath
        .split("/")
        .filter((part) => part.trim() !== "");
      const cleanedFolders: string[] = [];

      for (const part of folderParts) {
        // Clean each folder name (remove special characters, etc.)
        const cleanedPart = part.trim().replace(/[^a-zA-Z0-9\-_]/g, "");
        if (cleanedPart) {
          cleanedFolders.push(cleanedPart);
        }
      }

      if (cleanedFolders.length > 0) {
        objectKey = `${cleanedFolders.join("/")}/${actualFileName}`;
      } else {
        objectKey = actualFileName;
      }
    }

    const metaData = {
      "Content-Type": file.type,
      "Content-Length": file.size.toString(),
      "Original-Name": file.name,
    };

    try {
      // Check if bucket exists first
      const bucketExists = await this.minioClient.bucketExists(bucketName);

      if (!bucketExists) {
        console.log(`Bucket ${bucketName} doesn't exist.`);
      }

      // Upload file with folder structure if provided
      await this.minioClient.putObject(
        bucketName,
        objectKey,
        buffer,
        file.size,
        metaData
      );

      return {
        fileName: objectKey,
        size: file.size,
        mimetype: file.type,
      };
    } catch (error) {
      console.error("Error uploading file:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to upload file: ${errorMessage}`);
    }
  }

  async uploadChunk(
    bucketName: string,
    fileId: string,
    chunkNumber: number,
    chunkData: Buffer,
    originalFileName: string,
    mimeType: string
  ): Promise<void> {
    try {
      // Store chunk with naming convention: chunks/{fileId}/{chunkNumber}
      const chunkKey = `chunks/${fileId}/${String(chunkNumber).padStart(
        6,
        "0"
      )}`;

      const metaData = {
        "Content-Type": "application/octet-stream",
        "Original-File-Name": originalFileName,
        "Mime-Type": mimeType,
        "Chunk-Number": chunkNumber.toString(),
        "File-ID": fileId,
      };

      await this.minioClient.putObject(
        bucketName,
        chunkKey,
        chunkData,
        chunkData.length,
        metaData
      );

      console.log(`Uploaded chunk ${chunkNumber} for file ${fileId}`);
    } catch (error) {
      console.error(
        `Error uploading chunk ${chunkNumber} for file ${fileId}:`,
        error
      );
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to upload chunk: ${errorMessage}`);
    }
  }

  async mergeChunks(
    bucketName: string,
    fileId: string,
    totalChunks: number,
    originalFileName: string,
    mimeType: string,
    totalSize: number
  ): Promise<{
    fileName: string;
    size: number;
    mimetype: string;
  }> {
    try {
      // Extract folder structure from file name if it contains "/"
      let objectKey = originalFileName;

      if (originalFileName.includes("/")) {
        const folderPath = originalFileName.substring(
          0,
          originalFileName.lastIndexOf("/")
        );
        const actualFileName = originalFileName.substring(
          originalFileName.lastIndexOf("/") + 1
        );

        const folderParts = folderPath
          .split("/")
          .filter((part) => part.trim() !== "");
        const cleanedFolders: string[] = [];

        for (const part of folderParts) {
          const cleanedPart = part.trim().replace(/[^a-zA-Z0-9\-_]/g, "");
          if (cleanedPart) {
            cleanedFolders.push(cleanedPart);
          }
        }

        if (cleanedFolders.length > 0) {
          objectKey = `${cleanedFolders.join("/")}/${actualFileName}`;
        } else {
          objectKey = actualFileName;
        }
      }

      const metaData = {
        "Content-Type": mimeType,
        "Content-Length": totalSize.toString(),
        "Original-Name": originalFileName,
      };

      // Uses streaming to merge chunks
      const mergeStream = new PassThrough();
      let totalBytesWritten = 0;

      const mergePromise = new Promise<void>((resolve, reject) => {
        let currentChunk = 0;

        const processNextChunk = async () => {
          if (currentChunk >= totalChunks) {
            // Verify the final size matches expected size
            if (totalBytesWritten !== totalSize) {
              reject(
                new Error(
                  `Merged file size ${totalBytesWritten} doesn't match expected size ${totalSize}`
                )
              );
              return;
            }
            mergeStream.end();
            resolve();
            return;
          }

          const chunkKey = `chunks/${fileId}/${String(currentChunk).padStart(
            6,
            "0"
          )}`;
          try {
            const chunkStream = await this.minioClient.getObject(
              bucketName,
              chunkKey
            );

            chunkStream.on("data", (data: Buffer) => {
              totalBytesWritten += data.length;
              mergeStream.write(data);
            });

            chunkStream.on("end", () => {
              currentChunk++;
              processNextChunk();
            });

            chunkStream.on("error", (error) => {
              reject(
                new Error(
                  `Failed to read chunk ${currentChunk} for file ${fileId}: ${error.message}`
                )
              );
            });
          } catch (error) {
            reject(
              new Error(
                `Failed to retrieve chunk ${currentChunk} for file ${fileId}: ${error}`
              )
            );
          }
        };

        processNextChunk();
      });

      // Upload the merged file using streaming
      await Promise.all([
        this.minioClient.putObject(
          bucketName,
          objectKey,
          mergeStream,
          totalSize,
          metaData
        ),
        mergePromise,
      ]);

      // Clean up chunk files
      await this.cleanupChunks(bucketName, fileId, totalChunks);

      console.log(
        `Successfully merged ${totalChunks} chunks into ${objectKey}`
      );

      return {
        fileName: objectKey,
        size: totalSize,
        mimetype: mimeType,
      };
    } catch (error) {
      console.error(`Error merging chunks for file ${fileId}:`, error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to merge chunks: ${errorMessage}`);
    }
  }

  async cleanupChunks(
    bucketName: string,
    fileId: string,
    totalChunks: number
  ): Promise<void> {
    try {
      const chunksToDelete: string[] = [];

      for (let i = 0; i < totalChunks; i++) {
        const chunkKey = `chunks/${fileId}/${String(i).padStart(6, "0")}`;
        chunksToDelete.push(chunkKey);
      }

      if (chunksToDelete.length > 0) {
        await this.minioClient.removeObjects(bucketName, chunksToDelete);
        console.log(
          `Cleaned up ${chunksToDelete.length} chunk files for ${fileId}`
        );
      }
    } catch (error) {
      console.error(`Error cleaning up chunks for file ${fileId}:`, error);
    }
  }

  async checkChunkExists(
    bucketName: string,
    fileId: string,
    chunkNumber: number
  ): Promise<boolean> {
    try {
      const chunkKey = `chunks/${fileId}/${String(chunkNumber).padStart(
        6,
        "0"
      )}`;
      await this.minioClient.statObject(bucketName, chunkKey);
      return true;
    } catch {
      return false;
    }
  }

  async getUploadedChunks(
    bucketName: string,
    fileId: string
  ): Promise<number[]> {
    try {
      const prefix = `chunks/${fileId}/`;
      const objectsStream = this.minioClient.listObjectsV2(
        bucketName,
        prefix,
        false
      );
      const uploadedChunks: number[] = [];

      for await (const obj of objectsStream) {
        const chunkFileName = obj.name.split("/").pop();
        if (chunkFileName) {
          const chunkNumber = parseInt(chunkFileName, 10);
          if (!isNaN(chunkNumber)) {
            uploadedChunks.push(chunkNumber);
          }
        }
      }

      return uploadedChunks.sort((a, b) => a - b);
    } catch (error) {
      console.error(`Error getting uploaded chunks for file ${fileId}:`, error);
      return [];
    }
  }
}
