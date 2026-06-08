/*
  Warnings:

  - The values [GRAPHQL] on the enum `EndpointType` will be removed. If these variants are still used in the database, this will fail.
  - The values [HYBRID] on the enum `GenerationMode` will be removed. If these variants are still used in the database, this will fail.
  - The values [APPROVED] on the enum `WorkflowStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `approvedBy` on the `Workflow` table. All the data in the column will be lost.
  - You are about to drop the column `entities` on the `Workflow` table. All the data in the column will be lost.
  - You are about to drop the `AnalyticsEvent` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[workflowId,version]` on the table `WorkflowVersion` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `capabilityId` to the `Workflow` table without a default value. This is not possible if the table is not empty.
  - Added the required column `schemaId` to the `Workflow` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "EndpointType_new" AS ENUM ('REST', 'WEBHOOK');
ALTER TABLE "Workflow" ALTER COLUMN "endpointType" TYPE "EndpointType_new" USING ("endpointType"::text::"EndpointType_new");
ALTER TYPE "EndpointType" RENAME TO "EndpointType_old";
ALTER TYPE "EndpointType_new" RENAME TO "EndpointType";
DROP TYPE "public"."EndpointType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "GenerationMode_new" AS ENUM ('AI', 'GUIDED', 'MANUAL');
ALTER TABLE "Workflow" ALTER COLUMN "generationMode" TYPE "GenerationMode_new" USING ("generationMode"::text::"GenerationMode_new");
ALTER TYPE "GenerationMode" RENAME TO "GenerationMode_old";
ALTER TYPE "GenerationMode_new" RENAME TO "GenerationMode";
DROP TYPE "public"."GenerationMode_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "WorkflowStatus_new" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'INACTIVE', 'FAILED');
ALTER TABLE "Workflow" ALTER COLUMN "status" TYPE "WorkflowStatus_new" USING ("status"::text::"WorkflowStatus_new");
ALTER TYPE "WorkflowStatus" RENAME TO "WorkflowStatus_old";
ALTER TYPE "WorkflowStatus_new" RENAME TO "WorkflowStatus";
DROP TYPE "public"."WorkflowStatus_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "VoiceSession" DROP CONSTRAINT "VoiceSession_userId_fkey";

-- DropForeignKey
ALTER TABLE "Workflow" DROP CONSTRAINT "Workflow_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "WorkflowExecution" DROP CONSTRAINT "WorkflowExecution_workflowId_fkey";

-- DropForeignKey
ALTER TABLE "WorkflowTool" DROP CONSTRAINT "WorkflowTool_toolId_fkey";

-- DropForeignKey
ALTER TABLE "WorkflowTool" DROP CONSTRAINT "WorkflowTool_workflowId_fkey";

-- DropForeignKey
ALTER TABLE "WorkflowVersion" DROP CONSTRAINT "WorkflowVersion_workflowId_fkey";

-- AlterTable
ALTER TABLE "VoiceSession" ALTER COLUMN "startTime" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Workflow" DROP COLUMN "approvedBy",
DROP COLUMN "entities",
ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "capabilityId" TEXT NOT NULL,
ADD COLUMN     "schemaId" TEXT NOT NULL,
ADD COLUMN     "workflowJson" JSONB,
ALTER COLUMN "status" SET DEFAULT 'DRAFT',
ALTER COLUMN "endpointType" SET DEFAULT 'REST',
ALTER COLUMN "httpMethod" SET DEFAULT 'GET',
ALTER COLUMN "generationMode" SET DEFAULT 'AI';

-- AlterTable
ALTER TABLE "WorkflowExecution" ALTER COLUMN "latencyMs" DROP NOT NULL,
ALTER COLUMN "startedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- DropTable
DROP TABLE "AnalyticsEvent";

-- CreateIndex
CREATE INDEX "LogEntry_timestamp_idx" ON "LogEntry"("timestamp");

-- CreateIndex
CREATE INDEX "LogEntry_level_idx" ON "LogEntry"("level");

-- CreateIndex
CREATE INDEX "LogEntry_component_idx" ON "LogEntry"("component");

-- CreateIndex
CREATE INDEX "VoiceSession_userId_idx" ON "VoiceSession"("userId");

-- CreateIndex
CREATE INDEX "VoiceSession_status_idx" ON "VoiceSession"("status");

-- CreateIndex
CREATE INDEX "Workflow_schemaId_idx" ON "Workflow"("schemaId");

-- CreateIndex
CREATE INDEX "Workflow_capabilityId_idx" ON "Workflow"("capabilityId");

-- CreateIndex
CREATE INDEX "Workflow_ownerId_idx" ON "Workflow"("ownerId");

-- CreateIndex
CREATE INDEX "Workflow_status_idx" ON "Workflow"("status");

-- CreateIndex
CREATE INDEX "WorkflowExecution_workflowId_idx" ON "WorkflowExecution"("workflowId");

-- CreateIndex
CREATE INDEX "WorkflowExecution_status_idx" ON "WorkflowExecution"("status");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowVersion_workflowId_version_key" ON "WorkflowVersion"("workflowId", "version");

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_schemaId_fkey" FOREIGN KEY ("schemaId") REFERENCES "UploadedSchema"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowVersion" ADD CONSTRAINT "WorkflowVersion_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowExecution" ADD CONSTRAINT "WorkflowExecution_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowTool" ADD CONSTRAINT "WorkflowTool_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowTool" ADD CONSTRAINT "WorkflowTool_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceSession" ADD CONSTRAINT "VoiceSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
