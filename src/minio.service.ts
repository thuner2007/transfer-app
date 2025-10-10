import * as Minio from "minio";
import archiver from "archiver";

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

        // If public access requested, set the appropriate policy
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

  // Add a separate method to handle making buckets public
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

      // Create a zip archive
      const archive = archiver("zip", {
        zlib: { level: 9 }, // Maximum compression
      });

      // List all objects in the bucket
      const objectsStream = this.minioClient.listObjectsV2(
        bucketName,
        "",
        true
      );

      // Add each file to the archive
      for await (const obj of objectsStream) {
        const objectStream = await this.minioClient.getObject(
          bucketName,
          obj.name
        );
        archive.append(objectStream, { name: obj.name });
      }

      // Finalize the archive
      archive.finalize();

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

      // Upload file
      await this.minioClient.putObject(
        bucketName,
        file.name,
        buffer,
        file.size,
        metaData
      );

      return {
        fileName: file.name,
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
}
