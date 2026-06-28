-- CreateEnum
CREATE TYPE "RecurrenceType" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN');

-- Step 1: 신규 컬럼을 nullable / 기본값으로 추가 (기존 row 보존)
ALTER TABLE "Meeting"
  ADD COLUMN "recurrenceType" "RecurrenceType",
  ADD COLUMN "daysOfWeek"     "DayOfWeek"[] DEFAULT ARRAY[]::"DayOfWeek"[],
  ADD COLUMN "dayOfMonth"     INTEGER,
  ADD COLUMN "hour"           INTEGER,
  ADD COLUMN "minute"         INTEGER;

-- Step 2: 기존 row 일률 백필 (개발/더미 데이터 가정: 매주 목요일 오후 7시)
UPDATE "Meeting"
SET "recurrenceType" = 'WEEKLY',
    "daysOfWeek"     = ARRAY['THU']::"DayOfWeek"[],
    "hour"           = 19,
    "minute"         = 0
WHERE "recurrenceType" IS NULL;

-- Step 3: NOT NULL 강제
ALTER TABLE "Meeting"
  ALTER COLUMN "recurrenceType" SET NOT NULL,
  ALTER COLUMN "hour"           SET NOT NULL,
  ALTER COLUMN "minute"         SET NOT NULL;

-- Step 4: 구 컬럼 제거
ALTER TABLE "Meeting" DROP COLUMN "date";
