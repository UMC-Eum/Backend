/*
  Warnings:

  - Added the required column `capacity` to the `Meeting` table without a default value. This is not possible if the table is not empty.
  - Added the required column `introText` to the `Meeting` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "MeetingJoinPolicy" AS ENUM ('AUTO', 'APPROVAL_REQUIRED');

-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "capacity" INTEGER NOT NULL,
ADD COLUMN     "cost" VARCHAR(50),
ADD COLUMN     "introText" VARCHAR(200) NOT NULL,
ADD COLUMN     "joinPolicy" "MeetingJoinPolicy" NOT NULL DEFAULT 'AUTO',
ALTER COLUMN "date" SET DATA TYPE VARCHAR(100);
