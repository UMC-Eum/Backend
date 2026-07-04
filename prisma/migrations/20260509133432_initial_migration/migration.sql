CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('M', 'F');

-- CreateEnum
CREATE TYPE "ActiveStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "AddressLevel" AS ENUM ('SIDO', 'SIGUNGU', 'EMD', 'RI');

-- CreateEnum
CREATE TYPE "BlockStatus" AS ENUM ('BLOCKED', 'UNBLOCKED');

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('KAKAO');

-- CreateEnum
CREATE TYPE "ChatMediaType" AS ENUM ('AUDIO', 'PHOTO', 'VIDEO', 'TEXT');

-- CreateEnum
CREATE TYPE "ChatRoomStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('RECOMMEND', 'CHAT', 'HEART', 'PROFILE', 'REMIND', 'UPDATE');

-- CreateEnum
CREATE TYPE "ArticleCategory" AS ENUM ('NOTICE', 'REVIEW', 'CHECKIN', 'FREE');

-- CreateEnum
CREATE TYPE "ClubAuthority" AS ENUM ('GENERAL', 'HOST');

-- CreateEnum
CREATE TYPE "ClubUserStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED', 'KICKED');

-- CreateEnum
CREATE TYPE "ReportCategory" AS ENUM ('INAPPROPRIATE', 'SEXUAL_HARASSMENT', 'MONEY_REQUEST', 'ABUSE', 'SPAM', 'OTHERS');

-- CreateEnum
CREATE TYPE "ChatRoomType" AS ENUM ('DIRECT', 'CLUB');

-- CreateEnum
CREATE TYPE "ClubCategory" AS ENUM ('SPORTS', 'HOBBY', 'CULTURE_ART', 'VOLUNTEER', 'FOOD', 'STUDY', 'OTHERS');

-- CreateTable
CREATE TABLE "User" (
    "id" BIGSERIAL NOT NULL,
    "birthdate" TIMESTAMP(6) NOT NULL,
    "age" INTEGER NOT NULL DEFAULT 50,
    "email" VARCHAR(255) NOT NULL,
    "sex" "Sex" NOT NULL DEFAULT 'M',
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nickname" VARCHAR(20) NOT NULL,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "deletedAt" TIMESTAMP(6),
    "idealVoiceUrl" VARCHAR(512),
    "introVoiceUrl" VARCHAR(512) NOT NULL,
    "introText" VARCHAR(255) NOT NULL,
    "profileImageUrl" VARCHAR(512) NOT NULL,
    "status" "ActiveStatus" NOT NULL DEFAULT 'ACTIVE',
    "code" CHAR(10),
    "provider" "AuthProvider",
    "providerUserId" VARCHAR(64),
    "vibeVector" vector NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "tokenHash" VARCHAR(255) NOT NULL,
    "expiresAt" TIMESTAMP(6) NOT NULL,
    "revokedAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPhoto" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "url" VARCHAR(512) NOT NULL,
    "deletedAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Heart" (
    "id" BIGSERIAL NOT NULL,
    "sentById" BIGINT,
    "sentToId" BIGINT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(6),
    "status" "ActiveStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "Heart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interest" (
    "id" BIGSERIAL NOT NULL,
    "body" VARCHAR(50) NOT NULL,

    CONSTRAINT "Interest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserInterest" (
    "id" BIGSERIAL NOT NULL,
    "interestId" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "deletedAt" TIMESTAMP(6),
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserInterest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Personality" (
    "id" BIGSERIAL NOT NULL,
    "body" VARCHAR(50) NOT NULL,

    CONSTRAINT "Personality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserIdealPersonality" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "personalityId" BIGINT NOT NULL,
    "deletedAt" TIMESTAMP(6),
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserIdealPersonality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPersonality" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "personalityId" BIGINT NOT NULL,
    "deletedAt" TIMESTAMP(6),
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPersonality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Address" (
    "code" CHAR(10) NOT NULL,
    "sidoCode" CHAR(2) NOT NULL,
    "sigunguCode" CHAR(3) NOT NULL,
    "emdCode" CHAR(3) NOT NULL,
    "riCode" CHAR(2) NOT NULL,
    "fullName" VARCHAR(200) NOT NULL,
    "sidoName" VARCHAR(50) NOT NULL,
    "sigunguName" VARCHAR(50),
    "emdName" VARCHAR(50),
    "riName" VARCHAR(50),
    "level" "AddressLevel" NOT NULL DEFAULT 'SIGUNGU',
    "parentCode" CHAR(10),

    CONSTRAINT "Address_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "Block" (
    "id" BIGSERIAL NOT NULL,
    "blockedById" BIGINT NOT NULL,
    "blockedId" BIGINT NOT NULL,
    "blockedAt" TIMESTAMP(6) NOT NULL,
    "reason" VARCHAR(100) NOT NULL,
    "status" "BlockStatus" NOT NULL DEFAULT 'BLOCKED',
    "deletedAt" TIMESTAMP(6),

    CONSTRAINT "Block_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" BIGSERIAL NOT NULL,
    "reportedById" BIGINT,
    "reportedAt" TIMESTAMP(6) NOT NULL,
    "reason" VARCHAR(100) NOT NULL,
    "category" "ReportCategory" NOT NULL DEFAULT 'OTHERS',
    "deletedAt" TIMESTAMP(6),

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'CHAT',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(6),
    "title" VARCHAR(50) NOT NULL,
    "body" VARCHAR(100) NOT NULL,
    "sentById" BIGINT,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatRoom" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT,
    "startedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(6),
    "status" "ChatRoomStatus" NOT NULL DEFAULT 'ACTIVE',
    "type" "ChatRoomType" NOT NULL DEFAULT 'DIRECT',
    "clubId" BIGINT,

    CONSTRAINT "ChatRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatParticipant" (
    "id" BIGSERIAL NOT NULL,
    "joinedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" BIGINT,
    "roomId" BIGINT NOT NULL,
    "endedAt" TIMESTAMP(6),
    "role" "ClubAuthority" NOT NULL DEFAULT 'HOST',

    CONSTRAINT "ChatParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" BIGSERIAL NOT NULL,
    "sentAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "readAt" TIMESTAMP(6),
    "deletedAt" TIMESTAMP(6),
    "participantId" BIGINT NOT NULL,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMedia" (
    "id" BIGSERIAL NOT NULL,
    "messageId" BIGINT NOT NULL,
    "url" VARCHAR(512),
    "type" "ChatMediaType" NOT NULL DEFAULT 'TEXT',
    "text" VARCHAR(512),
    "durationSec" INTEGER,

    CONSTRAINT "ChatMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingAgreement" (
    "id" BIGSERIAL NOT NULL,
    "body" TEXT NOT NULL,

    CONSTRAINT "MarketingAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserMarketingAgreement" (
    "id" BIGSERIAL NOT NULL,
    "marketingAgreementId" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "agreedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isAgreed" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(6),

    CONSTRAINT "UserMarketingAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserWatchLog" (
    "id" BIGSERIAL NOT NULL,
    "visitedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visitedTo" BIGINT NOT NULL,
    "visitedBy" BIGINT NOT NULL,

    CONSTRAINT "UserWatchLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Article" (
    "id" BIGSERIAL NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "contents" TEXT NOT NULL,
    "category" "ArticleCategory" NOT NULL DEFAULT 'FREE',
    "userId" BIGINT,
    "clubId" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(6),
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "view" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" BIGSERIAL NOT NULL,
    "contents" TEXT NOT NULL,
    "userId" BIGINT,
    "articleId" BIGINT NOT NULL,
    "parentCommentId" BIGINT,
    "depth" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(6),

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleLike" (
    "id" BIGSERIAL NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "articleId" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,

    CONSTRAINT "ArticleLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticlePhoto" (
    "id" BIGSERIAL NOT NULL,
    "photoUrl" VARCHAR(512) NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(6),
    "articleId" BIGINT NOT NULL,
    "clubUserId" BIGINT,

    CONSTRAINT "ArticlePhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Club" (
    "id" BIGSERIAL NOT NULL,
    "hostId" BIGINT,
    "name" VARCHAR(50) NOT NULL,
    "introVoiceUrl" VARCHAR(512),
    "introText" VARCHAR(512),
    "category" "ClubCategory" NOT NULL DEFAULT 'OTHERS',
    "capacity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6),
    "deletedAt" TIMESTAMP(6),
    "code" CHAR(10),
    "likes" INTEGER NOT NULL,
    "vibeVector" vector NOT NULL,
    "thumbnailUrl" VARCHAR(512),

    CONSTRAINT "Club_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubUser" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "clubId" BIGINT NOT NULL,
    "joinedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(6),
    "authority" "ClubAuthority" NOT NULL DEFAULT 'GENERAL',
    "status" "ClubUserStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "ClubUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Badge" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(20) NOT NULL,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubUserBadge" (
    "id" BIGSERIAL NOT NULL,
    "clubUserId" BIGINT NOT NULL,
    "badgeId" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubUserBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubLike" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "clubId" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meeting" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "date" TIMESTAMP(6) NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(6),
    "updatedAt" TIMESTAMP(3),
    "clubId" BIGINT NOT NULL,
    "spot" TEXT NOT NULL,
    "isRegular" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingMember" (
    "id" BIGSERIAL NOT NULL,
    "meetingId" BIGINT NOT NULL,
    "clubUserId" BIGINT NOT NULL,
    "joinedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(6),

    CONSTRAINT "MeetingMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubKeyword" (
    "id" BIGSERIAL NOT NULL,
    "clubId" BIGINT NOT NULL,
    "keywordId" BIGINT NOT NULL,

    CONSTRAINT "ClubKeyword_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserReport" (
    "id" BIGSERIAL NOT NULL,
    "reportId" BIGINT NOT NULL,
    "reportedUserId" BIGINT,

    CONSTRAINT "UserReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubReport" (
    "id" BIGSERIAL NOT NULL,
    "reportId" BIGINT NOT NULL,
    "reportedClubId" BIGINT,

    CONSTRAINT "ClubReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

-- CreateIndex
CREATE INDEX "User_provider_idx" ON "User"("provider");

-- CreateIndex
CREATE INDEX "User_sex_status_idx" ON "User"("sex", "status");

-- CreateIndex
CREATE UNIQUE INDEX "User_provider_providerUserId_key" ON "User"("provider", "providerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");

-- CreateIndex
CREATE INDEX "UserPhoto_userId_idx" ON "UserPhoto"("userId");

-- CreateIndex
CREATE INDEX "UserPhoto_createdAt_idx" ON "UserPhoto"("createdAt");

-- CreateIndex
CREATE INDEX "Heart_sentById_idx" ON "Heart"("sentById");

-- CreateIndex
CREATE INDEX "Heart_sentToId_idx" ON "Heart"("sentToId");

-- CreateIndex
CREATE INDEX "Heart_createdAt_idx" ON "Heart"("createdAt");

-- CreateIndex
CREATE INDEX "Heart_status_idx" ON "Heart"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Heart_sentById_sentToId_key" ON "Heart"("sentById", "sentToId");

-- CreateIndex
CREATE UNIQUE INDEX "Interest_body_key" ON "Interest"("body");

-- CreateIndex
CREATE INDEX "UserInterest_userId_idx" ON "UserInterest"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserInterest_interestId_userId_key" ON "UserInterest"("interestId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Personality_body_key" ON "Personality"("body");

-- CreateIndex
CREATE INDEX "UserIdealPersonality_userId_idx" ON "UserIdealPersonality"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserIdealPersonality_userId_personalityId_key" ON "UserIdealPersonality"("userId", "personalityId");

-- CreateIndex
CREATE INDEX "UserPersonality_userId_idx" ON "UserPersonality"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPersonality_userId_personalityId_key" ON "UserPersonality"("userId", "personalityId");

-- CreateIndex
CREATE INDEX "Address_parentCode_idx" ON "Address"("parentCode");

-- CreateIndex
CREATE INDEX "Address_level_idx" ON "Address"("level");

-- CreateIndex
CREATE INDEX "Address_sidoCode_sigunguCode_emdCode_idx" ON "Address"("sidoCode", "sigunguCode", "emdCode");

-- CreateIndex
CREATE INDEX "Block_blockedById_idx" ON "Block"("blockedById");

-- CreateIndex
CREATE INDEX "Block_blockedId_idx" ON "Block"("blockedId");

-- CreateIndex
CREATE INDEX "Block_blockedAt_idx" ON "Block"("blockedAt");

-- CreateIndex
CREATE INDEX "Block_status_idx" ON "Block"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Block_blockedById_blockedId_key" ON "Block"("blockedById", "blockedId");

-- CreateIndex
CREATE INDEX "Report_reportedById_idx" ON "Report"("reportedById");

-- CreateIndex
CREATE INDEX "Report_reportedAt_idx" ON "Report"("reportedAt");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_sentById_idx" ON "Notification"("sentById");

-- CreateIndex
CREATE INDEX "ChatRoom_userId_idx" ON "ChatRoom"("userId");

-- CreateIndex
CREATE INDEX "ChatRoom_status_idx" ON "ChatRoom"("status");

-- CreateIndex
CREATE INDEX "ChatRoom_startedAt_idx" ON "ChatRoom"("startedAt");

-- CreateIndex
CREATE INDEX "ChatParticipant_userId_idx" ON "ChatParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatParticipant_roomId_userId_key" ON "ChatParticipant"("roomId", "userId");

-- CreateIndex
CREATE INDEX "ChatMessage_participantId_sentAt_idx" ON "ChatMessage"("participantId", "sentAt");

-- CreateIndex
CREATE INDEX "ChatMedia_messageId_idx" ON "ChatMedia"("messageId");

-- CreateIndex
CREATE INDEX "UserMarketingAgreement_userId_idx" ON "UserMarketingAgreement"("userId");

-- CreateIndex
CREATE INDEX "UserMarketingAgreement_agreedAt_idx" ON "UserMarketingAgreement"("agreedAt");

-- CreateIndex
CREATE INDEX "UserMarketingAgreement_isAgreed_idx" ON "UserMarketingAgreement"("isAgreed");

-- CreateIndex
CREATE UNIQUE INDEX "UserMarketingAgreement_marketingAgreementId_userId_key" ON "UserMarketingAgreement"("marketingAgreementId", "userId");

-- CreateIndex
CREATE INDEX "UserWatchLog_visitedTo_visitedAt_idx" ON "UserWatchLog"("visitedTo", "visitedAt");

-- CreateIndex
CREATE INDEX "UserWatchLog_visitedBy_visitedAt_idx" ON "UserWatchLog"("visitedBy", "visitedAt");

-- CreateIndex
CREATE INDEX "Article_clubId_createdAt_idx" ON "Article"("clubId", "createdAt");

-- CreateIndex
CREATE INDEX "Article_clubId_category_createdAt_idx" ON "Article"("clubId", "category", "createdAt");

-- CreateIndex
CREATE INDEX "Article_clubId_isPinned_createdAt_idx" ON "Article"("clubId", "isPinned", "createdAt");

-- CreateIndex
CREATE INDEX "Comment_articleId_createdAt_idx" ON "Comment"("articleId", "createdAt");

-- CreateIndex
CREATE INDEX "ArticleLike_articleId_idx" ON "ArticleLike"("articleId");

-- CreateIndex
CREATE UNIQUE INDEX "ArticleLike_articleId_userId_key" ON "ArticleLike"("articleId", "userId");

-- CreateIndex
CREATE INDEX "ArticlePhoto_articleId_createdAt_idx" ON "ArticlePhoto"("articleId", "createdAt");

-- CreateIndex
CREATE INDEX "Club_category_createdAt_idx" ON "Club"("category", "createdAt");

-- CreateIndex
CREATE INDEX "Club_code_createdAt_idx" ON "Club"("code", "createdAt");

-- CreateIndex
CREATE INDEX "ClubUser_userId_clubId_joinedAt_idx" ON "ClubUser"("userId", "clubId", "joinedAt");

-- CreateIndex
CREATE INDEX "ClubUser_clubId_joinedAt_idx" ON "ClubUser"("clubId", "joinedAt");

-- CreateIndex
CREATE INDEX "ClubUser_clubId_authority_idx" ON "ClubUser"("clubId", "authority");

-- CreateIndex
CREATE UNIQUE INDEX "ClubUser_userId_clubId_key" ON "ClubUser"("userId", "clubId");

-- CreateIndex
CREATE INDEX "ClubUserBadge_clubUserId_createdAt_idx" ON "ClubUserBadge"("clubUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ClubUserBadge_clubUserId_badgeId_key" ON "ClubUserBadge"("clubUserId", "badgeId");

-- CreateIndex
CREATE INDEX "ClubLike_clubId_idx" ON "ClubLike"("clubId");

-- CreateIndex
CREATE UNIQUE INDEX "ClubLike_userId_clubId_key" ON "ClubLike"("userId", "clubId");

-- CreateIndex
CREATE INDEX "Meeting_clubId_idx" ON "Meeting"("clubId");

-- CreateIndex
CREATE INDEX "MeetingMember_meetingId_joinedAt_idx" ON "MeetingMember"("meetingId", "joinedAt");

-- CreateIndex
CREATE INDEX "MeetingMember_clubUserId_joinedAt_idx" ON "MeetingMember"("clubUserId", "joinedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MeetingMember_meetingId_clubUserId_key" ON "MeetingMember"("meetingId", "clubUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ClubKeyword_clubId_keywordId_key" ON "ClubKeyword"("clubId", "keywordId");

-- CreateIndex
CREATE INDEX "UserReport_reportedUserId_idx" ON "UserReport"("reportedUserId");

-- CreateIndex
CREATE UNIQUE INDEX "UserReport_reportId_key" ON "UserReport"("reportId");

-- CreateIndex
CREATE INDEX "ClubReport_reportedClubId_idx" ON "ClubReport"("reportedClubId");

-- CreateIndex
CREATE UNIQUE INDEX "ClubReport_reportId_key" ON "ClubReport"("reportId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_code_fkey" FOREIGN KEY ("code") REFERENCES "Address"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPhoto" ADD CONSTRAINT "UserPhoto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Heart" ADD CONSTRAINT "Heart_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Heart" ADD CONSTRAINT "Heart_sentToId_fkey" FOREIGN KEY ("sentToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInterest" ADD CONSTRAINT "UserInterest_interestId_fkey" FOREIGN KEY ("interestId") REFERENCES "Interest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInterest" ADD CONSTRAINT "UserInterest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserIdealPersonality" ADD CONSTRAINT "UserIdealPersonality_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserIdealPersonality" ADD CONSTRAINT "UserIdealPersonality_personalityId_fkey" FOREIGN KEY ("personalityId") REFERENCES "Personality"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPersonality" ADD CONSTRAINT "UserPersonality_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPersonality" ADD CONSTRAINT "UserPersonality_personalityId_fkey" FOREIGN KEY ("personalityId") REFERENCES "Personality"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_parentCode_fkey" FOREIGN KEY ("parentCode") REFERENCES "Address"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_blockedById_fkey" FOREIGN KEY ("blockedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatRoom" ADD CONSTRAINT "ChatRoom_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatRoom" ADD CONSTRAINT "ChatRoom_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatParticipant" ADD CONSTRAINT "ChatParticipant_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "ChatRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatParticipant" ADD CONSTRAINT "ChatParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "ChatParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMedia" ADD CONSTRAINT "ChatMedia_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMarketingAgreement" ADD CONSTRAINT "UserMarketingAgreement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMarketingAgreement" ADD CONSTRAINT "UserMarketingAgreement_marketingAgreementId_fkey" FOREIGN KEY ("marketingAgreementId") REFERENCES "MarketingAgreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWatchLog" ADD CONSTRAINT "UserWatchLog_visitedTo_fkey" FOREIGN KEY ("visitedTo") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWatchLog" ADD CONSTRAINT "UserWatchLog_visitedBy_fkey" FOREIGN KEY ("visitedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentCommentId_fkey" FOREIGN KEY ("parentCommentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleLike" ADD CONSTRAINT "ArticleLike_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleLike" ADD CONSTRAINT "ArticleLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticlePhoto" ADD CONSTRAINT "ArticlePhoto_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticlePhoto" ADD CONSTRAINT "ArticlePhoto_clubUserId_fkey" FOREIGN KEY ("clubUserId") REFERENCES "ClubUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Club" ADD CONSTRAINT "Club_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Club" ADD CONSTRAINT "Club_code_fkey" FOREIGN KEY ("code") REFERENCES "Address"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubUser" ADD CONSTRAINT "ClubUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubUser" ADD CONSTRAINT "ClubUser_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubUserBadge" ADD CONSTRAINT "ClubUserBadge_clubUserId_fkey" FOREIGN KEY ("clubUserId") REFERENCES "ClubUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubUserBadge" ADD CONSTRAINT "ClubUserBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubLike" ADD CONSTRAINT "ClubLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubLike" ADD CONSTRAINT "ClubLike_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingMember" ADD CONSTRAINT "MeetingMember_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingMember" ADD CONSTRAINT "MeetingMember_clubUserId_fkey" FOREIGN KEY ("clubUserId") REFERENCES "ClubUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubKeyword" ADD CONSTRAINT "ClubKeyword_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubKeyword" ADD CONSTRAINT "ClubKeyword_keywordId_fkey" FOREIGN KEY ("keywordId") REFERENCES "Personality"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserReport" ADD CONSTRAINT "UserReport_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserReport" ADD CONSTRAINT "UserReport_reportedUserId_fkey" FOREIGN KEY ("reportedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubReport" ADD CONSTRAINT "ClubReport_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubReport" ADD CONSTRAINT "ClubReport_reportedClubId_fkey" FOREIGN KEY ("reportedClubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddCheckConstraint(대댓글 뎁스 체크)
ALTER TABLE "Comment"
ADD CONSTRAINT "comment_depth_check"
CHECK ("depth" IN (0, 1));

-- AddCheckConstraint(채팅방 타입-클럽id nullable여부)
ALTER TABLE "ChatRoom"
ADD CONSTRAINT "chat_room_club_id_check"
CHECK (
  ("type" = 'CLUB' AND "clubId" IS NOT NULL)
  OR
  ("type" = 'DIRECT' AND "clubId" IS NULL)
);

-- AddCheckConstraint(호스트가 무조건 존재하도록)
ALTER TABLE "Club"
ADD CONSTRAINT "club_host_id_check"
CHECK (
  "deletedAt" IS NOT NULL
  OR "hostId" IS NOT NULL
);
