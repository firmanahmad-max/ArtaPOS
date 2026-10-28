-- CreateEnum
CREATE TYPE "ReviewSource" AS ENUM ('SERVICE', 'BUILD', 'SALE');

-- CreateEnum
CREATE TYPE "TestimonialStatus" AS ENUM ('PENDING', 'APPROVED', 'HIDDEN');

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "googleReviewUrl" TEXT;

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "source" "ReviewSource" NOT NULL,
    "serviceTicketId" TEXT,
    "pcBuildId" TEXT,
    "saleId" TEXT,
    "docNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "rating" INTEGER,
    "comment" TEXT,
    "allowPublic" BOOLEAN NOT NULL DEFAULT false,
    "testimonial" "TestimonialStatus" NOT NULL DEFAULT 'PENDING',
    "googleClickedAt" TIMESTAMP(3),
    "followUpDoneAt" TIMESTAMP(3),
    "followUpNote" TEXT,
    "requestedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reviews_token_key" ON "reviews"("token");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_serviceTicketId_key" ON "reviews"("serviceTicketId");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_pcBuildId_key" ON "reviews"("pcBuildId");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_saleId_key" ON "reviews"("saleId");

-- CreateIndex
CREATE INDEX "reviews_tenantId_submittedAt_idx" ON "reviews"("tenantId", "submittedAt");

-- CreateIndex
CREATE INDEX "reviews_tenantId_rating_idx" ON "reviews"("tenantId", "rating");

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
