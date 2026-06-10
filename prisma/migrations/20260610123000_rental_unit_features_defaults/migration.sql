-- AlterTable
ALTER TABLE "rental_listings" ADD COLUMN "is_air_conditioned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "basic_features" JSONB,
ADD COLUMN "extra_amenities_text" TEXT,
ALTER COLUMN "area_sqm" SET DEFAULT 63,
ALTER COLUMN "bedrooms" SET DEFAULT 2;

-- AlterTable
ALTER TABLE "rental_owner_submissions" ADD COLUMN "is_air_conditioned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "basic_features" JSONB,
ADD COLUMN "extra_amenities_text" TEXT,
ALTER COLUMN "area_sqm" SET DEFAULT 63,
ALTER COLUMN "bedrooms" SET DEFAULT 2;

-- Data Migration
UPDATE "rental_listings" 
SET 
  "deposit_amount" = "monthly_rent" * 2,
  "area_sqm" = 63,
  "bedrooms" = 2,
  "is_air_conditioned" = false,
  "basic_features" = '["internet", "basic_appliances", "water_motor", "desks", "window_mesh", "water_heater", "water_filter"]'::jsonb;

UPDATE "rental_owner_submissions" 
SET 
  "deposit_amount" = "monthly_rent" * 2,
  "area_sqm" = 63,
  "bedrooms" = 2,
  "is_air_conditioned" = false,
  "basic_features" = '["internet", "basic_appliances", "water_motor", "desks", "window_mesh", "water_heater", "water_filter"]'::jsonb;
