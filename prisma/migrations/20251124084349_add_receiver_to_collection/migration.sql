-- AlterTable
ALTER TABLE "collection" ADD COLUMN     "receiver" TEXT,
ALTER COLUMN "expirationTime" SET DEFAULT now() + interval '3 days';
