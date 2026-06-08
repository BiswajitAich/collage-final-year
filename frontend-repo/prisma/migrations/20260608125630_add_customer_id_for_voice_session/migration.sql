-- AlterTable
ALTER TABLE "VoiceSession" ADD COLUMN     "customerId" TEXT;

-- CreateIndex
CREATE INDEX "VoiceSession_userId_customerId_idx" ON "VoiceSession"("userId", "customerId");
