-- Drop the timezone column since the platform now runs exclusively in Chile
ALTER TABLE "Company" DROP COLUMN IF EXISTS "timezone";
