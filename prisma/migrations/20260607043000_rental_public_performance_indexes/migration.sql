CREATE INDEX IF NOT EXISTS "rental_owners_created_at_idx"
  ON "rental_owners" ("created_at");

CREATE INDEX IF NOT EXISTS "rental_listings_listing_type_idx"
  ON "rental_listings" ("listing_type");

CREATE INDEX IF NOT EXISTS "rental_listings_bedrooms_idx"
  ON "rental_listings" ("bedrooms");

CREATE INDEX IF NOT EXISTS "rental_listings_bathrooms_idx"
  ON "rental_listings" ("bathrooms");

CREATE INDEX IF NOT EXISTS "rental_inquiries_created_at_idx"
  ON "rental_inquiries" ("created_at");
