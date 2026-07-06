-- CreateTable
CREATE TABLE "RecentSearchKeyword" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "keyword" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecentSearchKeyword_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RecentSearchKeyword_userId_keyword_key" ON "RecentSearchKeyword"("userId", "keyword");

-- CreateIndex
CREATE INDEX "RecentSearchKeyword_userId_createdAt_idx" ON "RecentSearchKeyword"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "RecentSearchKeyword" ADD CONSTRAINT "RecentSearchKeyword_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
