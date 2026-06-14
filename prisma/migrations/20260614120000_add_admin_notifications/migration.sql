-- CreateEnum
CREATE TYPE "AdminNotificationAudience" AS ENUM ('ADMIN');

-- CreateEnum
CREATE TYPE "AdminNotificationEventType" AS ENUM (
  'RENTAL_INQUIRY_CREATED',
  'RENTAL_OWNER_SUBMISSION_CREATED',
  'RENTAL_INQUIRY_APPROVED',
  'RENTAL_INQUIRY_CANCELLED',
  'RENTAL_OWNER_SUBMISSION_APPROVED',
  'RENTAL_OWNER_SUBMISSION_REJECTED',
  'SYSTEM'
);

-- CreateEnum
CREATE TYPE "AdminNotificationEntityType" AS ENUM (
  'RENTAL_INQUIRY',
  'RENTAL_OWNER_SUBMISSION',
  'RENTAL_LISTING',
  'RENTAL_TENANT',
  'SYSTEM'
);

-- CreateTable
CREATE TABLE "admin_notifications" (
  "id" TEXT NOT NULL,
  "compound_id" TEXT,
  "audience" "AdminNotificationAudience" NOT NULL DEFAULT 'ADMIN',
  "event_type" "AdminNotificationEventType" NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "entity_type" "AdminNotificationEntityType",
  "entity_id" TEXT,
  "target_url" TEXT,
  "read_at" TIMESTAMP(3),
  "metadata" JSONB,
  "dedupe_key" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE INDEX "admin_notifications_audience_idx" ON "admin_notifications"("audience");

-- CreateIndex
CREATE INDEX "admin_notifications_event_type_idx" ON "admin_notifications"("event_type");

-- CreateIndex
CREATE INDEX "admin_notifications_entity_type_entity_id_idx" ON "admin_notifications"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "admin_notifications_read_at_idx" ON "admin_notifications"("read_at");

-- CreateIndex
CREATE INDEX "admin_notifications_created_at_idx" ON "admin_notifications"("created_at");

-- CreateIndex
CREATE INDEX "admin_notifications_compound_id_idx" ON "admin_notifications"("compound_id");

-- CreateIndex
CREATE UNIQUE INDEX "admin_notifications_dedupe_key_key" ON "admin_notifications"("dedupe_key");

-- AddForeignKey
ALTER TABLE "admin_notifications" ADD CONSTRAINT "admin_notifications_compound_id_fkey" FOREIGN KEY ("compound_id") REFERENCES "compounds"("id") ON DELETE SET NULL ON UPDATE CASCADE;
