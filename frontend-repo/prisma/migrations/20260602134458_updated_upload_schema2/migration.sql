/*
  Warnings:

  - The values [UPLOADED,ANALYZING,FAILED] on the enum `SchemaStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "SchemaStatus_new" AS ENUM ('PARSED', 'ANALYZED', 'WORKFLOWS_GENERATED', 'DEPLOYED');
ALTER TABLE "UploadedSchema" ALTER COLUMN "status" TYPE "SchemaStatus_new" USING ("status"::text::"SchemaStatus_new");
ALTER TYPE "SchemaStatus" RENAME TO "SchemaStatus_old";
ALTER TYPE "SchemaStatus_new" RENAME TO "SchemaStatus";
DROP TYPE "public"."SchemaStatus_old";
COMMIT;
