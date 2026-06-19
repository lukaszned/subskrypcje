-- CreateEnum
CREATE TYPE "SubscriptionEventType" AS ENUM ('created', 'updated', 'paid', 'canceled');

-- DropIndex
DROP INDEX "Subscription_nextPaymentDate_idx";

-- DropIndex
DROP INDEX "Subscription_provider_idx";

-- AlterTable
ALTER TABLE "Subscription" ALTER COLUMN "currency" DROP DEFAULT;

-- CreateTable
CREATE TABLE "SubscriptionEvent" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "SubscriptionEventType" NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubscriptionEvent_subscriptionId_createdAt_idx" ON "SubscriptionEvent"("subscriptionId", "createdAt");

-- CreateIndex
CREATE INDEX "SubscriptionEvent_userId_createdAt_idx" ON "SubscriptionEvent"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "SubscriptionEvent" ADD CONSTRAINT "SubscriptionEvent_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
