ALTER TABLE "EmailVerification"
ADD COLUMN "consumedAt" TIMESTAMP(6);

CREATE INDEX "EmailVerification_consumedAt_idx"
ON "EmailVerification"("consumedAt");
