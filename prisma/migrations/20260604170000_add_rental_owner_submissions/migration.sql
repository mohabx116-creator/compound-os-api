-- CreateEnum
CREATE TYPE "RentalOwnerSubmissionStatus" AS ENUM ('NEW', 'UNDER_REVIEW', 'NEEDS_CHANGES', 'APPROVED', 'REJECTED', 'CONVERTED_TO_LISTING', 'CANCELLED');

-- CreateTable
CREATE TABLE "rental_owner_submissions" (
    "id" TEXT NOT NULL,
    "compound_id" TEXT NOT NULL,
    "owner_name" TEXT NOT NULL,
    "owner_phone" TEXT NOT NULL,
    "owner_email" TEXT,
    "owner_national_id" TEXT,
    "preferred_contact_method" TEXT,
    "listing_type" "RentalListingType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "address_text" TEXT,
    "location_text" TEXT,
    "floor" INTEGER,
    "area_sqm" DECIMAL(10,2),
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "furnishing_status" "RentalFurnishingStatus" NOT NULL,
    "monthly_rent" DECIMAL(12,2) NOT NULL,
    "deposit_amount" DECIMAL(12,2),
    "status" "RentalOwnerSubmissionStatus" NOT NULL DEFAULT 'NEW',
    "admin_notes" TEXT,
    "rejection_reason" TEXT,
    "created_listing_id" TEXT,
    "policy_accepted_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rental_owner_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental_owner_submission_images" (
    "id" TEXT NOT NULL,
    "submission_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "public_id" TEXT,
    "storage_path" TEXT,
    "alt_text" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_cover" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rental_owner_submission_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rental_owner_submissions_created_listing_id_key" ON "rental_owner_submissions"("created_listing_id");

-- CreateIndex
CREATE INDEX "rental_owner_submissions_compound_id_idx" ON "rental_owner_submissions"("compound_id");

-- CreateIndex
CREATE INDEX "rental_owner_submissions_owner_phone_idx" ON "rental_owner_submissions"("owner_phone");

-- CreateIndex
CREATE INDEX "rental_owner_submissions_status_idx" ON "rental_owner_submissions"("status");

-- CreateIndex
CREATE INDEX "rental_owner_submissions_created_at_idx" ON "rental_owner_submissions"("created_at");

-- CreateIndex
CREATE INDEX "rental_owner_submission_images_submission_id_idx" ON "rental_owner_submission_images"("submission_id");

-- CreateIndex
CREATE INDEX "rental_owner_submission_images_is_cover_idx" ON "rental_owner_submission_images"("is_cover");

-- CreateIndex
CREATE INDEX "rental_owner_submission_images_sort_order_idx" ON "rental_owner_submission_images"("sort_order");

-- AddForeignKey
ALTER TABLE "rental_owner_submissions" ADD CONSTRAINT "rental_owner_submissions_compound_id_fkey" FOREIGN KEY ("compound_id") REFERENCES "compounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_owner_submissions" ADD CONSTRAINT "rental_owner_submissions_created_listing_id_fkey" FOREIGN KEY ("created_listing_id") REFERENCES "rental_listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_owner_submission_images" ADD CONSTRAINT "rental_owner_submission_images_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "rental_owner_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
