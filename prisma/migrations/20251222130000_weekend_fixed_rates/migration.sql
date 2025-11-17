ALTER TABLE "CompanyPaySetting"
  ADD COLUMN "weekendDayRate" DECIMAL(12, 2) NOT NULL DEFAULT 60000,
  ADD COLUMN "weekendExtraHourRate" DECIMAL(10, 2) NOT NULL DEFAULT 8000,
  DROP COLUMN "factorFinde",
  DROP COLUMN "factorExtraFinde";
