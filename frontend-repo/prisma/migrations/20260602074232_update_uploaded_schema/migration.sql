/*
  Warnings:

  - You are about to drop the column `fileUrl` on the `UploadedSchema` table. All the data in the column will be lost.
  - Added the required column `content` to the `UploadedSchema` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "UploadedSchema" DROP COLUMN "fileUrl",
ADD COLUMN     "content" TEXT NOT NULL,
ADD COLUMN     "entityCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "relationshipCount" INTEGER NOT NULL DEFAULT 0;
