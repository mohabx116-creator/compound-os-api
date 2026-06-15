-- CreateEnum
CREATE TYPE "ServiceItemStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ServiceRequestPriority" AS ENUM ('NORMAL', 'URGENT');

-- CreateEnum
CREATE TYPE "ServiceRequestStatus" AS ENUM ('NEW', 'IN_REVIEW', 'CONTACTED', 'DONE', 'CANCELLED');

-- AlterEnum
ALTER TYPE "AdminNotificationEventType" ADD VALUE IF NOT EXISTS 'SERVICE_REQUEST_CREATED';

-- AlterEnum
ALTER TYPE "AdminNotificationEntityType" ADD VALUE IF NOT EXISTS 'SERVICE_REQUEST';

-- CreateTable
CREATE TABLE "service_items" (
    "id" TEXT NOT NULL,
    "compound_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "location_text" TEXT,
    "working_hours" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "accepts_requests" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" "ServiceItemStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_requests" (
    "id" TEXT NOT NULL,
    "compound_id" TEXT NOT NULL,
    "service_item_id" TEXT NOT NULL,
    "requester_name" TEXT NOT NULL,
    "requester_phone" TEXT NOT NULL,
    "unit_text" TEXT,
    "problem_description" TEXT NOT NULL,
    "priority" "ServiceRequestPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "ServiceRequestStatus" NOT NULL DEFAULT 'NEW',
    "preferred_time" TEXT,
    "image_url" TEXT,
    "admin_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_items_compound_id_idx" ON "service_items"("compound_id");

-- CreateIndex
CREATE INDEX "service_items_category_id_idx" ON "service_items"("category_id");

-- CreateIndex
CREATE INDEX "service_items_status_idx" ON "service_items"("status");

-- CreateIndex
CREATE INDEX "service_items_is_public_idx" ON "service_items"("is_public");

-- CreateIndex
CREATE INDEX "service_items_is_featured_idx" ON "service_items"("is_featured");

-- CreateIndex
CREATE INDEX "service_items_sort_order_idx" ON "service_items"("sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "service_items_compound_id_slug_key" ON "service_items"("compound_id", "slug");

-- CreateIndex
CREATE INDEX "service_requests_compound_id_idx" ON "service_requests"("compound_id");

-- CreateIndex
CREATE INDEX "service_requests_service_item_id_idx" ON "service_requests"("service_item_id");

-- CreateIndex
CREATE INDEX "service_requests_status_idx" ON "service_requests"("status");

-- CreateIndex
CREATE INDEX "service_requests_priority_idx" ON "service_requests"("priority");

-- CreateIndex
CREATE INDEX "service_requests_created_at_idx" ON "service_requests"("created_at");

-- AddForeignKey
ALTER TABLE "service_items" ADD CONSTRAINT "service_items_compound_id_fkey" FOREIGN KEY ("compound_id") REFERENCES "compounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_items" ADD CONSTRAINT "service_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "service_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_compound_id_fkey" FOREIGN KEY ("compound_id") REFERENCES "compounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_service_item_id_fkey" FOREIGN KEY ("service_item_id") REFERENCES "service_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
