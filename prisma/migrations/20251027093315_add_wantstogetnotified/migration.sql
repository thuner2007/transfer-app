-- AlterTable
ALTER TABLE "collection" ADD COLUMN     "wantsToGetNotified" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "expirationTime" SET DEFAULT now() + interval '3 days';
