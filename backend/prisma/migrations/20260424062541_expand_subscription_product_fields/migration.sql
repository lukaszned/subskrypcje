-- AlterEnum
ALTER TYPE "BillingCycle" ADD VALUE 'custom';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SubscriptionCategory" ADD VALUE 'productivity';
ALTER TYPE "SubscriptionCategory" ADD VALUE 'finance';
ALTER TYPE "SubscriptionCategory" ADD VALUE 'transport';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SubscriptionStatus" ADD VALUE 'overdue';
ALTER TYPE "SubscriptionStatus" ADD VALUE 'canceled';

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "cancelUrl" TEXT,
ADD COLUMN     "isRecurringBill" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastPaymentDate" TIMESTAMP(3),
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "paymentMethodLabel" TEXT,
ADD COLUMN     "planName" TEXT,
ADD COLUMN     "provider" TEXT,
ADD COLUMN     "reminderDaysBefore" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "trialEndDate" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Subscription_nextPaymentDate_idx" ON "Subscription"("nextPaymentDate");

-- CreateIndex
CREATE INDEX "Subscription_provider_idx" ON "Subscription"("provider");
