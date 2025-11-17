-- DropForeignKey
ALTER TABLE "KioskDevice" DROP CONSTRAINT "KioskDevice_companyId_fkey";

-- AlterTable
ALTER TABLE "CompanyPaySetting" ALTER COLUMN "sueldoMensualBase" DROP DEFAULT,
ALTER COLUMN "weekendDayRate" DROP DEFAULT,
ALTER COLUMN "weekendExtraHourRate" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "KioskDevice" ADD CONSTRAINT "KioskDevice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
