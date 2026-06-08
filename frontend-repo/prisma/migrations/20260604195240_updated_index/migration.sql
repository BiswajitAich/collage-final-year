/*
  Warnings:

  - A unique constraint covering the columns `[schemaId,capabilityId]` on the table `Workflow` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Workflow_schemaId_capabilityId_key" ON "Workflow"("schemaId", "capabilityId");
