ALTER TYPE "ReportTargetType" ADD VALUE IF NOT EXISTS 'COMMENT';

CREATE TABLE "CommentReport" (
    "id" BIGSERIAL NOT NULL,
    "reportId" BIGINT NOT NULL,
    "reportedCommentId" BIGINT,

    CONSTRAINT "CommentReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommentReport_reportId_key" ON "CommentReport"("reportId");
CREATE INDEX "CommentReport_reportedCommentId_idx" ON "CommentReport"("reportedCommentId");

ALTER TABLE "CommentReport"
ADD CONSTRAINT "CommentReport_reportId_fkey"
FOREIGN KEY ("reportId") REFERENCES "Report"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommentReport"
ADD CONSTRAINT "CommentReport_reportedCommentId_fkey"
FOREIGN KEY ("reportedCommentId") REFERENCES "Comment"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
