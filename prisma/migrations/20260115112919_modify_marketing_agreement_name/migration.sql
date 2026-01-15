/*
  Warnings:

  - You are about to drop the column `agreedAt` on the `marketingagreement` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `marketingagreement` table. All the data in the column will be lost.
  - You are about to drop the column `isAgreed` on the `marketingagreement` table. All the data in the column will be lost.
  - You are about to drop the column `marketingAgreementId` on the `marketingagreement` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `marketingagreement` table. All the data in the column will be lost.
  - You are about to drop the column `body` on the `usermarketingagreement` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[marketingAgreementId,userId]` on the table `UserMarketingAgreement` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `body` to the `MarketingAgreement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `marketingAgreementId` to the `UserMarketingAgreement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `UserMarketingAgreement` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `MarketingAgreement` DROP FOREIGN KEY `MarketingAgreement_marketingAgreementId_fkey`;

-- DropForeignKey
ALTER TABLE `MarketingAgreement` DROP FOREIGN KEY `MarketingAgreement_userId_fkey`;

-- DropIndex
DROP INDEX `MarketingAgreement_agreedAt_idx` ON `MarketingAgreement`;

-- DropIndex
DROP INDEX `MarketingAgreement_isAgreed_idx` ON `MarketingAgreement`;

-- DropIndex
DROP INDEX `MarketingAgreement_marketingAgreementId_userId_key` ON `MarketingAgreement`;

-- DropIndex
DROP INDEX `MarketingAgreement_userId_idx` ON `MarketingAgreement`;

-- AlterTable
ALTER TABLE `MarketingAgreement` DROP COLUMN `agreedAt`,
    DROP COLUMN `deletedAt`,
    DROP COLUMN `isAgreed`,
    DROP COLUMN `marketingAgreementId`,
    DROP COLUMN `userId`,
    ADD COLUMN `body` VARCHAR(255) NOT NULL;

-- AlterTable
ALTER TABLE `UserMarketingAgreement` DROP COLUMN `body`,
    ADD COLUMN `agreedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    ADD COLUMN `deletedAt` DATETIME(6) NULL,
    ADD COLUMN `isAgreed` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `marketingAgreementId` BIGINT NOT NULL,
    ADD COLUMN `userId` BIGINT NOT NULL;

-- CreateIndex
CREATE INDEX `UserMarketingAgreement_userId_idx` ON `UserMarketingAgreement`(`userId`);

-- CreateIndex
CREATE INDEX `UserMarketingAgreement_agreedAt_idx` ON `UserMarketingAgreement`(`agreedAt`);

-- CreateIndex
CREATE INDEX `UserMarketingAgreement_isAgreed_idx` ON `UserMarketingAgreement`(`isAgreed`);

-- CreateIndex
CREATE UNIQUE INDEX `UserMarketingAgreement_marketingAgreementId_userId_key` ON `UserMarketingAgreement`(`marketingAgreementId`, `userId`);

-- AddForeignKey
ALTER TABLE `UserMarketingAgreement` ADD CONSTRAINT `UserMarketingAgreement_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserMarketingAgreement` ADD CONSTRAINT `UserMarketingAgreement_marketingAgreementId_fkey` FOREIGN KEY (`marketingAgreementId`) REFERENCES `MarketingAgreement`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
