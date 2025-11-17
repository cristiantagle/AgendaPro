-- Add kiosk fields to companies
ALTER TABLE "Company" ADD COLUMN "kioskSlug" TEXT;
ALTER TABLE "Company" ADD COLUMN "kioskPin" TEXT NOT NULL DEFAULT '000000';

UPDATE "Company"
SET "kioskSlug" = COALESCE(NULLIF(regexp_replace(lower("name"), '[^a-z0-9]+', '-', 'g'), ''), 'empresa')
  || '-' || substr("id", 1, 8);

ALTER TABLE "Company" ALTER COLUMN "kioskSlug" SET NOT NULL;

CREATE UNIQUE INDEX "Company_kioskSlug_key" ON "Company"("kioskSlug");

-- Create kiosk devices table
CREATE TABLE "KioskDevice" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "KioskDevice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "KioskDevice_token_key" ON "KioskDevice"("token");
CREATE INDEX "KioskDevice_companyId_idx" ON "KioskDevice"("companyId");

ALTER TABLE "KioskDevice"
ADD CONSTRAINT "KioskDevice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
