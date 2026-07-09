/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `Tool` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `label` to the `Tool` table without a default value. This is not possible if the table is not empty.
  - Added the required column `n8nType` to the `Tool` table without a default value. This is not possible if the table is not empty.
  - Added the required column `typeVersion` to the `Tool` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Tool` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Tool" ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'general',
ADD COLUMN     "color" TEXT NOT NULL DEFAULT '#6366f1',
ADD COLUMN     "icon" TEXT,
ADD COLUMN     "label" TEXT NOT NULL,
ADD COLUMN     "n8nType" TEXT NOT NULL,
ADD COLUMN     "typeVersion" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Tool_name_key" ON "Tool"("name");
