/*
  Warnings:

  - A unique constraint covering the columns `[n8nWorkflowId]` on the table `Workflow` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Workflow" ADD COLUMN     "n8nWorkflowId" TEXT,
ADD COLUMN     "n8nWorkflowJson" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "Workflow_n8nWorkflowId_key" ON "Workflow"("n8nWorkflowId");
