ALTER TABLE "rental_owner_submissions" ADD COLUMN "owner_whatsapp" TEXT;
ALTER TABLE "rental_owner_submissions" ADD COLUMN "unit_condition" TEXT;
ALTER TABLE "rental_owner_submissions" ADD COLUMN "basics" TEXT;
ALTER TABLE "rental_owner_submissions" ADD COLUMN "amenities" TEXT;

ALTER TABLE "rental_listings" ADD COLUMN "unit_condition" TEXT;
ALTER TABLE "rental_listings" ADD COLUMN "basics" TEXT;
ALTER TABLE "rental_listings" ADD COLUMN "amenities" TEXT;
