import { PrismaClient } from "./generated/prisma";

const prismaService = new PrismaClient();

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

// Singleton pattern to ensure service starts only once
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

    // Set interval to run every 1 minute (60000 milliseconds)
    this.intervalId = setInterval(async () => {
      await cleanupExpiredVerifications();
    }, 60000);

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
