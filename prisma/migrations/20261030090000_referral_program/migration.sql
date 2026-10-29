-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'REWARDED', 'CANCELLED');

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "referralCode" TEXT;

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "referralEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "referralFriendPoints" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "referralMinPurchase" INTEGER NOT NULL DEFAULT 100000,
ADD COLUMN     "referralReferrerPoints" INTEGER NOT NULL DEFAULT 200,
ADD COLUMN     "referralValidDays" INTEGER NOT NULL DEFAULT 60;

-- CreateTable
CREATE TABLE "referrals" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "friendId" TEXT NOT NULL,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "rewardedAt" TIMESTAMP(3),
    "referrerPoints" INTEGER NOT NULL DEFAULT 0,
    "friendPoints" INTEGER NOT NULL DEFAULT 0,
    "qualifyingDoc" TEXT,
    "qualifyingTotal" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "referrals_friendId_key" ON "referrals"("friendId");

-- CreateIndex
CREATE INDEX "referrals_tenantId_status_idx" ON "referrals"("tenantId", "status");

-- CreateIndex
CREATE INDEX "referrals_referrerId_idx" ON "referrals"("referrerId");

-- CreateIndex
CREATE UNIQUE INDEX "customers_tenantId_referralCode_key" ON "customers"("tenantId", "referralCode");

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

