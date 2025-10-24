import { PrismaClient } from "./generated/prisma";
import { MinioService } from "./minio.service";

const prismaService = new PrismaClient();
const minioService = new MinioService();

// Cleanup function to delete expired verification entries
const cleanupExpiredVerifications = async () => {
  try {
    const result = await prismaService.verification.deleteMany({
      where: {
        verified: false,
        validUntil: {
          lt: new Date(), // Less than current time (expired)
        },
      },
    });

    if (result.count > 0) {
      console.log(
        `[${new Date().toISOString()}] Cleaned up ${
          result.count
        } expired verification entries`
      );
    } else {
      console.log(
        `[${new Date().toISOString()}] Cleanup check completed - no expired verification entries found`
      );
    }

    return result.count;
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error cleaning up expired verifications:`,
      error
    );
  }
};

// Cleanup function to delete expired download links
const cleanupExpiredDownloadLinks = async () => {
  try {
    const expiredCollections = await prismaService.collection.findMany({
      where: {
        expirationTime: {
          lt: new Date(),
        },
      },
    });

    for (const collection of expiredCollections) {
      await minioService.deleteBucket(collection.id);

      await prismaService.collection.delete({
        where: {
          id: collection.id,
        },
      });
    }

    if (expiredCollections.length > 0) {
      console.log(
        `[${new Date().toISOString()}] Cleaned up ${
          expiredCollections.length
        } expired download links`
      );
    } else {
      console.log(
        `[${new Date().toISOString()}] Cleanup check completed - no expired download links found`
      );
    }

    return expiredCollections.length;
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error cleaning up expired download links:`,
      error
    );
  }
};

class CleanupService {
  private static instance: CleanupService;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  private constructor() {}

  static getInstance(): CleanupService {
    if (!CleanupService.instance) {
      CleanupService.instance = new CleanupService();
    }
    return CleanupService.instance;
  }

  start() {
    if (this.isRunning) {
      console.log(
        `[${new Date().toISOString()}] Cleanup service is already running`
      );
      return;
    }

    console.log(
      `[${new Date().toISOString()}] Starting verification cleanup service - running every 1 minute`
    );

    // Run cleanup immediately when service starts
    cleanupExpiredVerifications();
    cleanupExpiredDownloadLinks();

    // Set interval to run every 1 minute (60000 milliseconds)
    this.intervalId = setInterval(async () => {
      await cleanupExpiredVerifications();
      await cleanupExpiredDownloadLinks();
    }, 6000);

    this.isRunning = true;
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.isRunning = false;
      console.log(
        `[${new Date().toISOString()}] Verification cleanup service stopped`
      );
    }
  }

  isServiceRunning(): boolean {
    return this.isRunning;
  }
}

// Export the singleton instance
export const cleanupService = CleanupService.getInstance();

// Auto-start the service when this module is imported
cleanupService.start();
