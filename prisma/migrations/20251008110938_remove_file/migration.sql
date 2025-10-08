/*
  Warnings:

  - You are about to drop the `file` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."file" DROP CONSTRAINT "file_collectionId_fkey";

-- DropTable
DROP TABLE "public"."file";
