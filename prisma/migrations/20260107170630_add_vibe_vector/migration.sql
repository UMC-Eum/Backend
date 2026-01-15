/*
  Warnings:

  - You are about to drop the column `vibeVector` on the `UserIdealPersonality` table. All the data in the column will be lost.
  - You are about to drop the column `vibeVector` on the `UserPersonality` table. All the data in the column will be lost.
  - Added the required column `vibeVector` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `User` ADD COLUMN `vibeVector` JSON NOT NULL;

-- AlterTable
ALTER TABLE `UserIdealPersonality` DROP COLUMN `vibeVector`;

-- AlterTable
ALTER TABLE `UserPersonality` DROP COLUMN `vibeVector`;
