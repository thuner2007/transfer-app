-- AlterTable
ALTER TABLE "collection" ALTER COLUMN "expirationTime" SET DEFAULT now() + interval '3 days',
ALTER COLUMN "expirationTime" SET DATA TYPE TIMESTAMP(6);
