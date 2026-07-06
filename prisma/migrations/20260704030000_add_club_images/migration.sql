-- CreateTable
CREATE TABLE "ClubImage" (
    "clubImageId" BIGSERIAL NOT NULL,
    "clubId" BIGINT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(6),

    CONSTRAINT "ClubImage_pkey" PRIMARY KEY ("clubImageId")
);

-- CreateIndex
CREATE INDEX "ClubImage_clubId_sortOrder_idx" ON "ClubImage"("clubId", "sortOrder");

-- CreateIndex
CREATE INDEX "ClubImage_deletedAt_idx" ON "ClubImage"("deletedAt");

-- AddForeignKey
ALTER TABLE "ClubImage" ADD CONSTRAINT "ClubImage_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;
