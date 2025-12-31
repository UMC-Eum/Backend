-- CreateTable
CREATE TABLE `User` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `birthdate` DATETIME(6) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `sex` ENUM('M', 'F') NOT NULL DEFAULT 'M',
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `nickname` VARCHAR(20) NOT NULL,
    `updatedAt` DATETIME(6) NOT NULL,
    `deletedAt` DATETIME(6) NULL,
    `idealVoiceUrl` VARCHAR(512) NULL,
    `introVoiceUrl` VARCHAR(512) NOT NULL,
    `introText` VARCHAR(255) NOT NULL,
    `profileImageUrl` VARCHAR(512) NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `code` CHAR(10) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    INDEX `User_status_idx`(`status`),
    INDEX `User_createdAt_idx`(`createdAt`),
    INDEX `User_deletedAt_idx`(`deletedAt`),
    INDEX `User_sex_status_idx`(`sex`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserPhoto` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `userId` BIGINT NOT NULL,
    `url` VARCHAR(512) NOT NULL,
    `deletedAt` DATETIME(6) NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `UserPhoto_userId_idx`(`userId`),
    INDEX `UserPhoto_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Heart` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `sentById` BIGINT NOT NULL,
    `sentToId` BIGINT NOT NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `deletedAt` DATETIME(6) NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',

    INDEX `Heart_sentById_idx`(`sentById`),
    INDEX `Heart_sentToId_idx`(`sentToId`),
    INDEX `Heart_createdAt_idx`(`createdAt`),
    INDEX `Heart_status_idx`(`status`),
    UNIQUE INDEX `Heart_sentById_sentToId_key`(`sentById`, `sentToId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Interest` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `body` VARCHAR(50) NOT NULL,

    UNIQUE INDEX `Interest_body_key`(`body`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserInterest` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `interestId` BIGINT NOT NULL,
    `userId` BIGINT NOT NULL,
    `deletedAt` DATETIME(6) NULL,
    `updatedAt` DATETIME(6) NOT NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `vibeVector` JSON NOT NULL,

    INDEX `UserInterest_userId_idx`(`userId`),
    UNIQUE INDEX `UserInterest_interestId_userId_key`(`interestId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Personality` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `body` VARCHAR(50) NOT NULL,

    UNIQUE INDEX `Personality_body_key`(`body`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserIdealPersonality` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `userId` BIGINT NOT NULL,
    `personalityId` BIGINT NOT NULL,
    `deletedAt` DATETIME(6) NULL,
    `updatedAt` DATETIME(6) NOT NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `vibeVector` JSON NOT NULL,

    INDEX `UserIdealPersonality_userId_idx`(`userId`),
    UNIQUE INDEX `UserIdealPersonality_userId_personalityId_key`(`userId`, `personalityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserPersonality` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `userId` BIGINT NOT NULL,
    `personalityId` BIGINT NOT NULL,
    `deletedAt` DATETIME(6) NULL,
    `updatedAt` DATETIME(6) NOT NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `vibeVector` JSON NOT NULL,

    INDEX `UserPersonality_userId_idx`(`userId`),
    UNIQUE INDEX `UserPersonality_userId_personalityId_key`(`userId`, `personalityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Address` (
    `code` CHAR(10) NOT NULL,
    `sidoCode` CHAR(2) NOT NULL,
    `sigunguCode` CHAR(3) NOT NULL,
    `emdCode` CHAR(3) NOT NULL,
    `riCode` CHAR(2) NOT NULL,
    `fullName` VARCHAR(200) NOT NULL,
    `sidoName` VARCHAR(50) NOT NULL,
    `sigunguName` VARCHAR(50) NOT NULL,
    `emdName` VARCHAR(50) NOT NULL,
    `riName` VARCHAR(50) NULL,
    `level` ENUM('SIDO', 'SIGUNGU', 'EMD', 'RI') NOT NULL DEFAULT 'SIGUNGU',
    `parentCode` CHAR(10) NULL,

    INDEX `Address_parentCode_idx`(`parentCode`),
    INDEX `Address_level_idx`(`level`),
    INDEX `Address_sidoCode_sigunguCode_emdCode_idx`(`sidoCode`, `sigunguCode`, `emdCode`),
    PRIMARY KEY (`code`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Block` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `blockedById` BIGINT NOT NULL,
    `blockedId` BIGINT NOT NULL,
    `blockedAt` DATETIME(6) NOT NULL,
    `reason` VARCHAR(100) NOT NULL,
    `status` ENUM('BLOCKED', 'UNBLOCKED') NOT NULL DEFAULT 'BLOCKED',
    `deletedAt` DATETIME(6) NULL,

    INDEX `Block_blockedById_idx`(`blockedById`),
    INDEX `Block_blockedId_idx`(`blockedId`),
    INDEX `Block_blockedAt_idx`(`blockedAt`),
    INDEX `Block_status_idx`(`status`),
    UNIQUE INDEX `Block_blockedById_blockedId_key`(`blockedById`, `blockedId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Report` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `reportedById` BIGINT NOT NULL,
    `reportedId` BIGINT NOT NULL,
    `reportedAt` DATETIME(6) NOT NULL,
    `reason` VARCHAR(100) NOT NULL,
    `deletedAt` DATETIME(6) NULL,

    INDEX `Report_reportedById_idx`(`reportedById`),
    INDEX `Report_reportedId_idx`(`reportedId`),
    INDEX `Report_reportedAt_idx`(`reportedAt`),
    UNIQUE INDEX `Report_reportedById_reportedId_key`(`reportedById`, `reportedId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notification` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `userId` BIGINT NOT NULL,
    `type` ENUM('RECOMMEND', 'CHAT', 'HEART', 'PROFILE', 'REMIND', 'UPDATE') NOT NULL DEFAULT 'CHAT',
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `deletedAt` DATETIME(6) NULL,
    `title` VARCHAR(50) NOT NULL,
    `body` VARCHAR(100) NOT NULL,

    INDEX `Notification_userId_isRead_idx`(`userId`, `isRead`),
    INDEX `Notification_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ChatRoom` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `userId` BIGINT NOT NULL,
    `startedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `endedAt` DATETIME(6) NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',

    INDEX `ChatRoom_userId_idx`(`userId`),
    INDEX `ChatRoom_status_idx`(`status`),
    INDEX `ChatRoom_startedAt_idx`(`startedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ChatParticipant` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `joinedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `userId` BIGINT NOT NULL,
    `roomId` BIGINT NOT NULL,
    `endedAt` DATETIME(6) NULL,

    INDEX `ChatParticipant_userId_idx`(`userId`),
    UNIQUE INDEX `ChatParticipant_roomId_userId_key`(`roomId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ChatMessage` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `sentAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,
    `readAt` DATETIME(6) NULL,
    `deletedAt` DATETIME(6) NULL,
    `sentById` BIGINT NOT NULL,
    `sentToId` BIGINT NOT NULL,
    `roomId` BIGINT NOT NULL,

    INDEX `ChatMessage_sentById_idx`(`sentById`),
    INDEX `ChatMessage_sentToId_idx`(`sentToId`),
    INDEX `ChatMessage_sentAt_idx`(`sentAt`),
    INDEX `ChatMessage_roomId_sentAt_idx`(`roomId`, `sentAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ChatMedia` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `messageId` BIGINT NOT NULL,
    `url` VARCHAR(512) NULL,
    `type` ENUM('AUDIO', 'PHOTO', 'VIDEO', 'TEXT') NOT NULL DEFAULT 'TEXT',
    `text` VARCHAR(512) NULL,

    INDEX `ChatMedia_messageId_idx`(`messageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserMarketingAgreement` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `body` VARCHAR(255) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MarketingAgreement` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `marketingAgreementId` BIGINT NOT NULL,
    `userId` BIGINT NOT NULL,
    `agreedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `isAgreed` BOOLEAN NOT NULL DEFAULT true,
    `deletedAt` DATETIME(6) NULL,

    INDEX `MarketingAgreement_userId_idx`(`userId`),
    INDEX `MarketingAgreement_agreedAt_idx`(`agreedAt`),
    INDEX `MarketingAgreement_isAgreed_idx`(`isAgreed`),
    UNIQUE INDEX `MarketingAgreement_marketingAgreementId_userId_key`(`marketingAgreementId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_code_fkey` FOREIGN KEY (`code`) REFERENCES `Address`(`code`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserPhoto` ADD CONSTRAINT `UserPhoto_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Heart` ADD CONSTRAINT `Heart_sentById_fkey` FOREIGN KEY (`sentById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Heart` ADD CONSTRAINT `Heart_sentToId_fkey` FOREIGN KEY (`sentToId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserInterest` ADD CONSTRAINT `UserInterest_interestId_fkey` FOREIGN KEY (`interestId`) REFERENCES `Interest`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserInterest` ADD CONSTRAINT `UserInterest_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserIdealPersonality` ADD CONSTRAINT `UserIdealPersonality_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserIdealPersonality` ADD CONSTRAINT `UserIdealPersonality_personalityId_fkey` FOREIGN KEY (`personalityId`) REFERENCES `Personality`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserPersonality` ADD CONSTRAINT `UserPersonality_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserPersonality` ADD CONSTRAINT `UserPersonality_personalityId_fkey` FOREIGN KEY (`personalityId`) REFERENCES `Personality`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Address` ADD CONSTRAINT `Address_parentCode_fkey` FOREIGN KEY (`parentCode`) REFERENCES `Address`(`code`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Block` ADD CONSTRAINT `Block_blockedById_fkey` FOREIGN KEY (`blockedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Block` ADD CONSTRAINT `Block_blockedId_fkey` FOREIGN KEY (`blockedId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Report` ADD CONSTRAINT `Report_reportedById_fkey` FOREIGN KEY (`reportedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Report` ADD CONSTRAINT `Report_reportedId_fkey` FOREIGN KEY (`reportedId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatRoom` ADD CONSTRAINT `ChatRoom_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatParticipant` ADD CONSTRAINT `ChatParticipant_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `ChatRoom`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatParticipant` ADD CONSTRAINT `ChatParticipant_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatMessage` ADD CONSTRAINT `ChatMessage_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `ChatRoom`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatMessage` ADD CONSTRAINT `ChatMessage_sentById_fkey` FOREIGN KEY (`sentById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatMessage` ADD CONSTRAINT `ChatMessage_sentToId_fkey` FOREIGN KEY (`sentToId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatMedia` ADD CONSTRAINT `ChatMedia_messageId_fkey` FOREIGN KEY (`messageId`) REFERENCES `ChatMessage`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketingAgreement` ADD CONSTRAINT `MarketingAgreement_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketingAgreement` ADD CONSTRAINT `MarketingAgreement_marketingAgreementId_fkey` FOREIGN KEY (`marketingAgreementId`) REFERENCES `UserMarketingAgreement`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
