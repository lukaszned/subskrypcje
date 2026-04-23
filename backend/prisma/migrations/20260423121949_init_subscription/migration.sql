-- CreateEnum
CREATE TYPE "SubscriptionCategory" AS ENUM ('entertainment', 'utilities', 'shopping', 'health', 'education', 'other');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('monthly', 'yearly', 'weekly', 'one_time');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('pending', 'paid');

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PLN',
    "category" "SubscriptionCategory" NOT NULL,
    "billingCycle" "BillingCycle" NOT NULL,
    "nextPaymentDate" TIMESTAMP(3) NOT NULL,
    "isTrial" BOOLEAN NOT NULL DEFAULT false,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);
