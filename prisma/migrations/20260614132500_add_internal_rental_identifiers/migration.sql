-- AlterTable
ALTER TABLE "rental_listings" ADD COLUMN "building_number" TEXT,
ADD COLUMN "apartment_number" TEXT;

-- AlterTable
ALTER TABLE "rental_owner_submissions" ADD COLUMN "building_number" TEXT,
ADD COLUMN "apartment_number" TEXT;
