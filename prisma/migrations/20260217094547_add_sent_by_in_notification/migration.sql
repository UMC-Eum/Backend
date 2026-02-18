-- AlterTable
ALTER TABLE `Notification` ADD COLUMN `sentById` BIGINT NULL;

-- CreateIndex
CREATE INDEX `Notification_sentById_idx` ON `Notification`(`sentById`);

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_sentById_fkey` FOREIGN KEY (`sentById`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
