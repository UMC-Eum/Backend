CREATE TYPE "ModerationSurface" AS ENUM (
  'ARTICLE',
  'COMMENT',
  'USER_PROFILE',
  'CLUB',
  'CHAT'
);

CREATE TYPE "ModerationTargetType" AS ENUM (
  'USER',
  'CLUB',
  'ARTICLE',
  'COMMENT'
);

CREATE TYPE "ModerationDecision" AS ENUM (
  'BLOCK',
  'REVIEW'
);

CREATE TABLE "ContentModerationLog" (
  "id" BIGSERIAL NOT NULL,
  "userId" BIGINT,
  "surface" "ModerationSurface" NOT NULL,
  "targetType" "ModerationTargetType",
  "targetId" BIGINT,
  "decision" "ModerationDecision" NOT NULL,
  "provider" VARCHAR(30) NOT NULL DEFAULT 'OPENAI',
  "model" VARCHAR(80) NOT NULL,
  "providerResponseId" VARCHAR(100),
  "violatedCategories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "inputTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "categoryScores" JSONB,
  "contentHash" VARCHAR(64),
  "requestPath" VARCHAR(255),
  "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ContentModerationLog_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ContentModerationLog"
  ADD CONSTRAINT "ContentModerationLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ContentModerationLog_userId_createdAt_idx"
  ON "ContentModerationLog"("userId", "createdAt");

CREATE INDEX "ContentModerationLog_decision_surface_createdAt_idx"
  ON "ContentModerationLog"("decision", "surface", "createdAt");

CREATE INDEX "ContentModerationLog_targetType_targetId_idx"
  ON "ContentModerationLog"("targetType", "targetId");

CREATE INDEX "ContentModerationLog_createdAt_idx"
  ON "ContentModerationLog"("createdAt");

CREATE INDEX "ContentModerationLog_violatedCategories_gin_idx"
  ON "ContentModerationLog" USING GIN ("violatedCategories");
