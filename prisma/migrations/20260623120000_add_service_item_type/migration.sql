-- Add a first-class service type for public grouping and admin management.
CREATE TYPE "ServiceItemType" AS ENUM ('TECHNICAL', 'REAL_ESTATE');

ALTER TABLE "service_items"
  ADD COLUMN "service_type" "ServiceItemType" NOT NULL DEFAULT 'TECHNICAL';

CREATE INDEX "service_items_service_type_idx" ON "service_items"("service_type");

-- Verified exact identifiers from the current public services API response:
-- compound_id = ca155709-2f8c-47ab-8e91-6fa0504cf435
-- slug = service-1781559056995 -> خدمة متابعة الايجار
-- slug = service-1781558841196 -> ادارة الصيانة
-- slug = service-1781559003868 -> خدمة تشطيب الشقق
UPDATE "service_items"
SET "service_type" = 'REAL_ESTATE'
WHERE "compound_id" = 'ca155709-2f8c-47ab-8e91-6fa0504cf435'
  AND "slug" = 'service-1781559056995';

UPDATE "service_items"
SET "service_type" = 'REAL_ESTATE'
WHERE "compound_id" = 'ca155709-2f8c-47ab-8e91-6fa0504cf435'
  AND "slug" = 'service-1781558841196';

UPDATE "service_items"
SET "service_type" = 'REAL_ESTATE'
WHERE "compound_id" = 'ca155709-2f8c-47ab-8e91-6fa0504cf435'
  AND "slug" = 'service-1781559003868';
