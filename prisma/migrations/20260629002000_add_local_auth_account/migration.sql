ALTER TYPE "AuthProvider" ADD VALUE 'LOCAL';

CREATE TABLE "LocalAuthAccount" (
    "id" BIGSERIAL NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "userId" BIGINT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "LocalAuthAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LocalAuthAccount_username_key" ON "LocalAuthAccount"("username");
CREATE INDEX "LocalAuthAccount_userId_idx" ON "LocalAuthAccount"("userId");
CREATE INDEX "LocalAuthAccount_isActive_idx" ON "LocalAuthAccount"("isActive");

ALTER TABLE "LocalAuthAccount"
ADD CONSTRAINT "LocalAuthAccount_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
