-- Create enums for the new structured sale-property specifications
CREATE TYPE "RealEstateFinishingStatus" AS ENUM ('WITHOUT_FINISHING', 'FINISHED', 'FINISHED_FURNISHED');
CREATE TYPE "RealEstatePhase" AS ENUM ('PHASE_ONE', 'PHASE_TWO');
CREATE TYPE "RealEstateElectricityStatus" AS ENUM ('ELECTRICITY_METER', 'ELECTRICITY_PRACTICE');
CREATE TYPE "RealEstateOwnershipProofType" AS ENUM ('CONTRACT', 'POWER_OF_ATTORNEY');

-- Real estate listings
ALTER TABLE "real_estate_listings"
  ADD COLUMN "amenities" JSONB,
  ALTER COLUMN "floor" TYPE TEXT USING "floor"::TEXT,
  ADD COLUMN "finishing_status" "RealEstateFinishingStatus",
  ADD COLUMN "phase" "RealEstatePhase",
  ADD COLUMN "electricity_status" "RealEstateElectricityStatus",
  ADD COLUMN "ownership_proof_type" "RealEstateOwnershipProofType",
  ADD COLUMN "has_installments" BOOLEAN,
  ADD COLUMN "has_deposit" BOOLEAN,
  ADD COLUMN "has_final_contract" BOOLEAN;

-- Owner submissions
ALTER TABLE "real_estate_owner_submissions"
  ADD COLUMN "amenities" JSONB,
  ALTER COLUMN "floor" TYPE TEXT USING "floor"::TEXT,
  ADD COLUMN "finishing_status" "RealEstateFinishingStatus",
  ADD COLUMN "phase" "RealEstatePhase",
  ADD COLUMN "electricity_status" "RealEstateElectricityStatus",
  ADD COLUMN "ownership_proof_type" "RealEstateOwnershipProofType",
  ADD COLUMN "has_installments" BOOLEAN,
  ADD COLUMN "has_deposit" BOOLEAN,
  ADD COLUMN "has_final_contract" BOOLEAN;
