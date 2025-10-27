-- AlterTable
ALTER TABLE "collection" ALTER COLUMN "filesSize" SET DATA TYPE BIGINT,
ALTER COLUMN "expirationTime" SET DEFAULT now() + interval '3 days';

-- AlterTable
ALTER TABLE "file" ALTER COLUMN "size" SET DATA TYPE BIGINT;
