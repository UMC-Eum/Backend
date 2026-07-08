CREATE TYPE "ReportTargetType" AS ENUM ('USER', 'CLUB', 'ARTICLE');

ALTER TABLE "Report"
  ADD COLUMN "targetType" "ReportTargetType",
  ADD COLUMN "targetId" BIGINT;

CREATE INDEX "Report_targetType_targetId_idx" ON "Report"("targetType", "targetId");
