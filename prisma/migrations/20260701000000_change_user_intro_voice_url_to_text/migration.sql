-- AlterTable
ALTER TABLE "User" ALTER COLUMN "idealVoiceUrl" TYPE TEXT;
ALTER TABLE "User" ALTER COLUMN "introVoiceUrl" TYPE TEXT;
ALTER TABLE "User" ALTER COLUMN "profileImageUrl" TYPE TEXT;

-- AlterTable
ALTER TABLE "UserPhoto" ALTER COLUMN "url" TYPE TEXT;

-- AlterTable
ALTER TABLE "ChatMedia" ALTER COLUMN "url" TYPE TEXT;

-- AlterTable
ALTER TABLE "ArticlePhoto" ALTER COLUMN "photoUrl" TYPE TEXT;

-- AlterTable
ALTER TABLE "Club" ALTER COLUMN "introVoiceUrl" TYPE TEXT;
ALTER TABLE "Club" ALTER COLUMN "thumbnailUrl" TYPE TEXT;
