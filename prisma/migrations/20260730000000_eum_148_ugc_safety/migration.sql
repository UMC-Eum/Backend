-- Add report targets required by iOS UGC safety review.
ALTER TYPE "ReportTargetType" ADD VALUE IF NOT EXISTS 'PROFILE';
ALTER TYPE "ReportTargetType" ADD VALUE IF NOT EXISTS 'VOICE';

-- Store agreement type/version/required metadata and preserve the version
-- accepted by each user.
CREATE TYPE "AgreementType" AS ENUM ('POLICY', 'PERSONAL_INFORMATION', 'MARKETING');

ALTER TABLE "MarketingAgreement"
ADD COLUMN "type" "AgreementType" NOT NULL DEFAULT 'MARKETING',
ADD COLUMN "version" VARCHAR(20) NOT NULL DEFAULT '1.0.0',
ADD COLUMN "isRequired" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "UserMarketingAgreement"
ADD COLUMN "agreementType" "AgreementType" NOT NULL DEFAULT 'MARKETING',
ADD COLUMN "agreementVersion" VARCHAR(20) NOT NULL DEFAULT '1.0.0';

UPDATE "UserMarketingAgreement" uma
SET
  "agreementType" = ma."type",
  "agreementVersion" = ma."version"
FROM "MarketingAgreement" ma
WHERE uma."marketingAgreementId" = ma."id";

CREATE INDEX "MarketingAgreement_type_idx" ON "MarketingAgreement"("type");
CREATE INDEX "MarketingAgreement_isRequired_idx" ON "MarketingAgreement"("isRequired");
