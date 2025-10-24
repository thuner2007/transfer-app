/*
  Warnings:

  - Made the column `expirationTime` on table `collection` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "collection" ALTER COLUMN "expirationTime" SET NOT NULL;
