ALTER TABLE "residents"
  ADD COLUMN "is_platform_owner" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "platform_revenue_entries" (
    "id" TEXT NOT NULL,
    "compound_id" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "revenue_category" TEXT NOT NULL,
    "listing_id" TEXT,
    "real_estate_listing_id" TEXT,
    "reservation_id" TEXT,
    "payment_id" TEXT,
    "amount_egp" INTEGER NOT NULL,
    "unit_rate_egp" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
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

DO $$
BEGIN
  IF (SELECT COUNT(*) FROM "residents" WHERE "role" = 'ADMIN') = 1 THEN
    UPDATE "residents"
    SET "is_platform_owner" = TRUE
    WHERE "role" = 'ADMIN';
  END IF;
END
$$;
