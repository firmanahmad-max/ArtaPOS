-- CreateTable
CREATE TABLE "gallery_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT,
    "title" TEXT NOT NULL,
    "spec" TEXT,
    "price" INTEGER NOT NULL DEFAULT 0,
    "photo" TEXT,
    "label" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gallery_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gallery_items_tenantId_idx" ON "gallery_items"("tenantId");

-- AddForeignKey
ALTER TABLE "gallery_items" ADD CONSTRAINT "gallery_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_items" ADD CONSTRAINT "gallery_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
