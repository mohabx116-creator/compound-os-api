-- AlterEnum
-- This migration adds more values to the RealEstateFinishing enum
ALTER TYPE "RealEstateFinishing" ADD VALUE 'SUPER_LUX';
ALTER TYPE "RealEstateFinishing" ADD VALUE 'LUX';
ALTER TYPE "RealEstateFinishing" ADD VALUE 'UNFINISHED';
ALTER TYPE "RealEstateFinishing" ADD VALUE 'OLD_FINISH';

-- CreateEnum
CREATE TYPE "RealEstateFurnishingStatus" AS ENUM ('FURNISHED', 'UNFURNISHED', 'SEMI_FURNISHED');

-- AlterTable
ALTER TABLE "real_estate_listings" ADD COLUMN "balconies" INTEGER;
ALTER TABLE "real_estate_listings" ADD COLUMN "building_age" INTEGER;
ALTER TABLE "real_estate_listings" ADD COLUMN "furnishing_status" "RealEstateFurnishingStatus";
ALTER TABLE "real_estate_listings" ADD COLUMN "has_building_permit" BOOLEAN;
ALTER TABLE "real_estate_listings" ADD COLUMN "reception_rooms" INTEGER;

-- AlterTable
ALTER TABLE "real_estate_owner_submissions" ADD COLUMN "balconies" INTEGER;
ALTER TABLE "real_estate_owner_submissions" ADD COLUMN "building_age" INTEGER;
ALTER TABLE "real_estate_owner_submissions" ADD COLUMN "furnishing_status" "RealEstateFurnishingStatus";
ALTER TABLE "real_estate_owner_submissions" ADD COLUMN "has_building_permit" BOOLEAN;
ALTER TABLE "real_estate_owner_submissions" ADD COLUMN "reception_rooms" INTEGER;
