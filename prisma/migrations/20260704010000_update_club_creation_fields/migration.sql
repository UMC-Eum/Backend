-- AlterEnum
ALTER TABLE "Club" ALTER COLUMN "category" DROP DEFAULT;
CREATE TYPE "ClubCategory_new" AS ENUM ('SPORTS', 'HOBBY', 'CULTURE_ART', 'VOLUNTEER', 'FOOD', 'STUDY', 'OTHERS');
ALTER TABLE "Club"
  ALTER COLUMN "category" TYPE "ClubCategory_new"
  USING (
    CASE "category"::text
      WHEN 'LANGUAGE' THEN 'STUDY'
      WHEN 'OUTDOOR' THEN 'HOBBY'
      WHEN 'CULTURE' THEN 'CULTURE_ART'
      ELSE "category"::text
    END
  )::"ClubCategory_new";
ALTER TYPE "ClubCategory" RENAME TO "ClubCategory_old";
ALTER TYPE "ClubCategory_new" RENAME TO "ClubCategory";
DROP TYPE "ClubCategory_old";
ALTER TABLE "Club" ALTER COLUMN "category" SET DEFAULT 'OTHERS';

-- AlterTable
ALTER TABLE "Club" ADD COLUMN "approvalRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Club" ADD COLUMN "boardPublic" BOOLEAN NOT NULL DEFAULT true;
