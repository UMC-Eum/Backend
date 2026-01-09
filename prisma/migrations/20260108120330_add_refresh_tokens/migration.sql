/*
  Warnings:

  - A unique constraint covering the columns `[provider,providerUserId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
*/
-- AlterTable
ALTER TABLE `User`
  ADD COLUMN `provider` ENUM('KAKAO') NULL,
  ADD COLUMN `providerUserId` VARCHAR(64) NULL;

  -- Backfill provider information for existing users to avoid uniqueness issues
UPDATE `User`
SET
  `provider` = 'KAKAO',
  `providerUserId` = CONCAT('legacy_', `id`)
WHERE
  `provider` IS NULL
  AND `providerUserId` IS NULL;

-- CreateTable
CREATE TABLE `RefreshToken` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `userId` BIGINT NOT NULL,
  `tokenHash` VARCHAR(255) NOT NULL,
  `expiresAt` DATETIME(6) NOT NULL,
  `revokedAt` DATETIME(6) NULL,
  `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

  UNIQUE INDEX `RefreshToken_tokenHash_key`(`tokenHash`),
  INDEX `RefreshToken_userId_idx`(`userId`),
  INDEX `RefreshToken_expiresAt_idx`(`expiresAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `User_provider_idx` ON `User`(`provider`);

-- CreateIndex
CREATE UNIQUE INDEX `User_provider_providerUserId_key` ON `User`(`provider`, `providerUserId`);

-- AddForeignKey
ALTER TABLE `RefreshToken` ADD CONSTRAINT `RefreshToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;