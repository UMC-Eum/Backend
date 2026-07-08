CREATE TYPE "ReportTargetType" AS ENUM ('USER', 'CLUB', 'ARTICLE');

ALTER TABLE "Report"
  ADD COLUMN "targetType" "ReportTargetType",
  ADD COLUMN "targetId" BIGINT,
  ADD COLUMN "chatRoomId" BIGINT;

UPDATE "Report"
SET
  "targetType" = 'USER',
  "targetId" = "UserReport"."reportedUserId"
FROM "UserReport"
WHERE "UserReport"."reportId" = "Report"."id"
  AND "UserReport"."reportedUserId" IS NOT NULL;

UPDATE "Report"
SET
  "targetType" = 'CLUB',
  "targetId" = "ClubReport"."reportedClubId"
FROM "ClubReport"
WHERE "ClubReport"."reportId" = "Report"."id"
  AND "ClubReport"."reportedClubId" IS NOT NULL;

CREATE INDEX "Report_targetType_targetId_idx" ON "Report"("targetType", "targetId");
CREATE INDEX "Report_chatRoomId_idx" ON "Report"("chatRoomId");
CREATE UNIQUE INDEX "Report_reportedById_targetType_targetId_active_key"
  ON "Report"("reportedById", "targetType", "targetId")
  WHERE "reportedById" IS NOT NULL
    AND "targetType" IS NOT NULL
    AND "targetId" IS NOT NULL
    AND "deletedAt" IS NULL;
