ALTER TABLE "platform_revenue_entries"
  ADD COLUMN "entry_kind" TEXT NOT NULL DEFAULT 'CHARGE',
  ADD COLUMN "reversal_of_entry_id" TEXT;

DROP INDEX IF EXISTS "platform_revenue_entries_source_type_source_id_key";

CREATE UNIQUE INDEX "platform_revenue_entries_source_type_source_id_entry_kind_key"
  ON "platform_revenue_entries"("source_type", "source_id", "entry_kind");

CREATE UNIQUE INDEX "platform_revenue_entries_reversal_of_entry_id_key"
  ON "platform_revenue_entries"("reversal_of_entry_id");

INSERT INTO "platform_revenue_entries" (
  "id",
  "compound_id",
  "source_type",
  "source_id",
  "entry_kind",
  "revenue_category",
  "listing_id",
  "real_estate_listing_id",
  "reservation_id",
  "payment_id",
  "amount_egp",
  "unit_rate_egp",
  "quantity",
  "description",
  "metadata",
  "occurred_at",
  "created_at"
)
SELECT
  'baseline:rental_listing:' || rl."id" || ':charge',
  rl."compound_id",
  'RENTAL_LISTING',
  rl."id",
  'CHARGE',
  CASE
    WHEN rl."is_featured" THEN 'RENTAL_FEATURED_LISTING'
    ELSE 'RENTAL_STANDARD_LISTING'
  END,
  rl."id",
  NULL,
  NULL,
  NULL,
  CASE
    WHEN rl."is_featured" THEN 750
    ELSE 500
  END,
  CASE
    WHEN rl."is_featured" THEN 750
    ELSE 500
  END,
  1,
  CASE
    WHEN rl."is_featured" THEN 'رسوم نشر إعلان إيجار مميز'
    ELSE 'رسوم نشر إعلان إيجار عادي'
  END,
  jsonb_build_object(
    'title', rl."title",
    'slug', rl."slug",
    'isFeatured', rl."is_featured"
  ),
  COALESCE(rl."published_at", rl."created_at", CURRENT_TIMESTAMP),
  COALESCE(rl."published_at", rl."created_at", CURRENT_TIMESTAMP)
FROM "rental_listings" rl
WHERE rl."status" = 'ACTIVE'
  AND rl."is_published" = TRUE
  AND (rl."expires_at" IS NULL OR rl."expires_at" > CURRENT_TIMESTAMP)
ON CONFLICT ("source_type", "source_id", "entry_kind") DO NOTHING;

INSERT INTO "platform_revenue_entries" (
  "id",
  "compound_id",
  "source_type",
  "source_id",
  "entry_kind",
  "revenue_category",
  "listing_id",
  "real_estate_listing_id",
  "reservation_id",
  "payment_id",
  "amount_egp",
  "unit_rate_egp",
  "quantity",
  "description",
  "metadata",
  "occurred_at",
  "created_at"
)
SELECT
  'baseline:real_estate_listing:' || rel."id" || ':charge',
  rel."compound_id",
  'REAL_ESTATE_LISTING',
  rel."id",
  'CHARGE',
  'SALE_APARTMENT_LISTING',
  NULL,
  rel."id",
  NULL,
  NULL,
  1000,
  1000,
  1,
  'رسوم نشر إعلان بيع عقار',
  jsonb_build_object(
    'title', rel."title",
    'slug', rel."slug"
  ),
  COALESCE(rel."published_at", rel."created_at", CURRENT_TIMESTAMP),
  COALESCE(rel."published_at", rel."created_at", CURRENT_TIMESTAMP)
FROM "real_estate_listings" rel
WHERE rel."status" = 'PUBLISHED'
ON CONFLICT ("source_type", "source_id", "entry_kind") DO NOTHING;
