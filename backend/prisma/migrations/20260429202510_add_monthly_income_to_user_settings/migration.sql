-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN     "incomeCurrency" TEXT NOT NULL DEFAULT 'PLN',
ADD COLUMN     "monthlyIncome" DECIMAL(12,2);
