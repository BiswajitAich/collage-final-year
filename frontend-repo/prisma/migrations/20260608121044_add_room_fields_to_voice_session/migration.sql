/*
  Warnings:

  - The values [IDLE] on the enum `SessionStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "SessionStatus_new" AS ENUM ('PENDING', 'ACTIVE', 'ENDED', 'FAILED');
ALTER TABLE "VoiceSession" ALTER COLUMN "status" TYPE "SessionStatus_new" USING ("status"::text::"SessionStatus_new");
ALTER TYPE "SessionStatus" RENAME TO "SessionStatus_old";
ALTER TYPE "SessionStatus_new" RENAME TO "SessionStatus";
DROP TYPE "public"."SessionStatus_old";
COMMIT;

-- AlterTable
ALTER TABLE "VoiceSession" ADD COLUMN     "phoneNumber" TEXT,
ADD COLUMN     "roomName" TEXT;
