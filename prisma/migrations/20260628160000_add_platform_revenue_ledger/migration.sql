CREATE TYPE "PlatformRevenueSourceType" AS ENUM ('RENTAL_LISTING', 'RENTAL_RESERVATION', 'REAL_ESTATE_LISTING');

CREATE TYPE "PlatformRevenueCategory" AS ENUM (
  'RENTAL_STANDARD_LISTING',
  'RENTAL_FEATURED_LISTING',
  'BED_RENTAL',
  'SALE_APARTMENT_LISTING'
);

CREATE TABLE "platform_revenue_entries" (
    "id" TEXT NOT NULL,
    "compound_id" TEXT NOT NULL,
    "source_type" "PlatformRevenueSourceType" NOT NULL,
    "source_id" TEXT NOT NULL,
    "revenue_category" "PlatformRevenueCategory" NOT NULL,
    "listing_id" TEXT,
    "real_estate_listing_id" TEXT,
    "reservation_id" TEXT,
    "payment_id" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "unit_rate" DECIMAL(12,2) NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_revenue_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "platform_revenue_entries_source_type_source_id_key"
  ON "platform_revenue_entries"("source_type", "source_id");

CREATE INDEX "platform_revenue_entries_compound_id_idx" ON "platform_revenue_entries"("compound_id");
CREATE INDEX "platform_revenue_entries_listing_id_idx" ON "platform_revenue_entries"("listing_id");
CREATE INDEX "platform_revenue_entries_real_estate_listing_id_idx" ON "platform_revenue_entries"("real_estate_listing_id");
CREATE INDEX "platform_revenue_entries_reservation_id_idx" ON "platform_revenue_entries"("reservation_id");
CREATE INDEX "platform_revenue_entries_payment_id_idx" ON "platform_revenue_entries"("payment_id");
CREATE INDEX "platform_revenue_entries_occurred_at_idx" ON "platform_revenue_entries"("occurred_at");

ALTER TABLE "platform_revenue_entries"
  ADD CONSTRAINT "platform_revenue_entries_compound_id_fkey"
  FOREIGN KEY ("compound_id") REFERENCES "compounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "platform_revenue_entries"
  ADD CONSTRAINT "platform_revenue_entries_listing_id_fkey"
  FOREIGN KEY ("listing_id") REFERENCES "rental_listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "platform_revenue_entries"
  ADD CONSTRAINT "platform_revenue_entries_real_estate_listing_id_fkey"
  FOREIGN KEY ("real_estate_listing_id") REFERENCES "real_estate_listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "platform_revenue_entries"
  ADD CONSTRAINT "platform_revenue_entries_reservation_id_fkey"
  FOREIGN KEY ("reservation_id") REFERENCES "rental_reservations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "platform_revenue_entries"
  ADD CONSTRAINT "platform_revenue_entries_payment_id_fkey"
  FOREIGN KEY ("payment_id") REFERENCES "rental_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill already published rental listings.
INSERT INTO "platform_revenue_entries" (
  "id",
  "compound_id",
  "source_type",
  "source_id",
  "revenue_category",
  "listing_id",
  "amount",
  "unit_rate",
  "quantity",
  "currency",
  "description",
  "metadata",
  "occurred_at",
  "created_at"
)
SELECT
  md5('rental-listing-fee:' || "id"),
  "compound_id",
  'RENTAL_LISTING',
  "id",
  CASE
    WHEN "is_featured" THEN 'RENTAL_FEATURED_LISTING'
    ELSE 'RENTAL_STANDARD_LISTING'
  END,
  "id",
  CASE
    WHEN "is_featured" THEN 750.00
    ELSE 500.00
  END,
  CASE
    WHEN "is_featured" THEN 750.00
    ELSE 500.00
  END,
  1.00,
  'EGP',
  CASE
    WHEN "is_featured" THEN 'Ø±Ø³ÙˆÙ… Ù†Ø´Ø± Ø¥Ø¹Ù„Ø§Ù† Ø¥ÙŠØ¬Ø§Ø± Ù…Ù…ÙŠØ²'
    ELSE 'Ø±Ø³ÙˆÙ… Ù†Ø´Ø± Ø¥Ø¹Ù„Ø§Ù† Ø¥ÙŠØ¬Ø§Ø± Ø¹Ø§Ø¯ÙŠ'
  END,
  jsonb_build_object('title', "title", 'slug', "slug", 'isFeatured', "is_featured"),
  COALESCE("published_at", "created_at"),
  COALESCE("published_at", "created_at")
FROM "rental_listings"
WHERE "published_at" IS NOT NULL
ON CONFLICT ("source_type", "source_id") DO NOTHING;

-- Backfill confirmed rental reservations as bed-rental revenue.
WITH reservation_bed_counts AS (
  SELECT
    "reservation_id",
    COUNT(*)::numeric(12,2) AS "quantity"
  FROM "rental_beds"
  WHERE "reservation_id" IS NOT NULL
  GROUP BY "reservation_id"
)
INSERT INTO "platform_revenue_entries" (
  "id",
  "compound_id",
  "source_type",
  "source_id",
  "revenue_category",
  "listing_id",
  "reservation_id",
  "amount",
  "unit_rate",
  "quantity",
  "currency",
  "description",
  "metadata",
  "occurred_at",
  "created_at"
)
SELECT
  md5('bed-rental:' || r."id"),
  r."compound_id",
  'RENTAL_RESERVATION',
  r."id",
  'BED_RENTAL',
  r."listing_id",
  r."id",
  (200.00 * COALESCE(rbc."quantity", 1.00)),
  200.00,
  COALESCE(rbc."quantity", 1.00),
  'EGP',
  'Ø¥ÙŠØ±Ø§Ø¯ ØªØ£Ø¬ÙŠØ± Ø³Ø±ÙŠØ± Ù…Ø¤ÙƒØ¯',
  jsonb_build_object('tenantName', r."tenant_name"),
  COALESCE(r."confirmed_at", r."created_at"),
  COALESCE(r."confirmed_at", r."created_at")
FROM "rental_reservations" r
LEFT JOIN reservation_bed_counts rbc ON rbc."reservation_id" = r."id"
WHERE r."status" = 'CONFIRMED'
  AND r."confirmed_at" IS NOT NULL
ON CONFLICT ("source_type", "source_id") DO NOTHING;

-- Historical real-estate sale backfill intentionally skipped.
-- The legacy apartment-type discriminator is no longer available, so
-- historical records cannot be proven to be apartment sale listings
-- without inferring from free text or other unreliable fields.
