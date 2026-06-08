/*
  Warnings:

  - You are about to drop the column `content` on the `UploadedSchema` table. All the data in the column will be lost.
  - Added the required column `rawContent` to the `UploadedSchema` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "UploadedSchema" DROP COLUMN "content",
ADD COLUMN     "parsedJson" JSONB,
ADD COLUMN     "rawContent" TEXT NOT NULL;
