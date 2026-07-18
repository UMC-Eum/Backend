-- CreateEnum
CREATE TYPE "MeetingMemberStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED');

-- AlterTable: 신규 컬럼 추가 (기존 행은 전부 현재 참석자이므로 status 기본값 ACTIVE로 백필)
ALTER TABLE "MeetingMember"
ADD COLUMN "status" "MeetingMemberStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "requestedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "joinMessage" VARCHAR(300) NOT NULL DEFAULT '';

-- 기존 참석자의 신청 시각은 참석(joinedAt) 시각으로 백필
UPDATE "MeetingMember"
SET "requestedAt" = "joinedAt";

-- joinedAt: 승인 대기(PENDING)에서는 null이어야 하므로 nullable화 + 기본값 제거
ALTER TABLE "MeetingMember"
ALTER COLUMN "joinedAt" DROP NOT NULL,
ALTER COLUMN "joinedAt" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "MeetingMember_meetingId_status_idx" ON "MeetingMember"("meetingId", "status");
