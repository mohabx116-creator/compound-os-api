-- Remove deprecated sale-spec fields and clean stored amenities arrays
UPDATE "real_estate_listings"
SET "amenities" = (
  SELECT COALESCE(jsonb_agg(value), '[]'::jsonb)
  FROM jsonb_array_elements_text(COALESCE("amenities", '[]'::jsonb)) AS value
  WHERE value IN (
    'SURVEILLANCE_CAMERAS',
    'NATURAL_GAS',
    'WATER_METER',
    'GAS_METER',
    'AIR_CONDITIONERS',
    'ELECTRICAL_APPLIANCES'
  )
)
WHERE "amenities" IS NOT NULL;

UPDATE "real_estate_owner_submissions"
SET "amenities" = (
  SELECT COALESCE(jsonb_agg(value), '[]'::jsonb)
  FROM jsonb_array_elements_text(COALESCE("amenities", '[]'::jsonb)) AS value
  WHERE value IN (
    'SURVEILLANCE_CAMERAS',
    'NATURAL_GAS',
    'WATER_METER',
    'GAS_METER',
    'AIR_CONDITIONERS',
    'ELECTRICAL_APPLIANCES'
  )
)
WHERE "amenities" IS NOT NULL;

ALTER TABLE "real_estate_listings"
  DROP COLUMN IF EXISTS "type",
  DROP COLUMN IF EXISTS "electricity_status";

ALTER TABLE "real_estate_owner_submissions"
  DROP COLUMN IF EXISTS "type",
  DROP COLUMN IF EXISTS "electricity_status";

DROP TYPE IF EXISTS "RealEstateType";
DROP TYPE IF EXISTS "RealEstateElectricityStatus";
