-- AlterEnum
ALTER TYPE "ChatMediaType" ADD VALUE 'SYSTEM';

-- AlterTable
ALTER TABLE "ChatParticipant" ADD COLUMN     "lastReadAt" TIMESTAMP(6),
ALTER COLUMN "role" SET DEFAULT 'GENERAL';

-- CreateIndex
CREATE INDEX "ChatParticipant_roomId_endedAt_idx" ON "ChatParticipant"("roomId", "endedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChatRoom_clubId_key" ON "ChatRoom"("clubId");

-- Backfill: 기존 참여자의 읽음 커서를 joinedAt으로 시드 (과거 메시지 unread 폭증 방지)
UPDATE "ChatParticipant" SET "lastReadAt" = "joinedAt" WHERE "lastReadAt" IS NULL;
