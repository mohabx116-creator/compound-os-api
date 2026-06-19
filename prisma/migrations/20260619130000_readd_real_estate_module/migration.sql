-- CreateEnum
CREATE TYPE "RealEstateType" AS ENUM ('APARTMENT', 'VILLA', 'STUDIO', 'DUPLEX', 'SHOP', 'OFFICE', 'LAND');

-- CreateEnum
CREATE TYPE "RealEstateStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'HIDDEN', 'UNDER_NEGOTIATION', 'RESERVED', 'SOLD', 'REJECTED');

-- CreateEnum
CREATE TYPE "RealEstateFinishing" AS ENUM ('CORE_AND_SHELL', 'SEMI_FINISHED', 'FULLY_FINISHED', 'FURNISHED');

-- CreateEnum
CREATE TYPE "RealEstateInquiryType" AS ENUM ('CONTACT', 'INSPECTION', 'INTEREST');

-- CreateEnum
CREATE TYPE "RealEstateInquiryStatus" AS ENUM ('NEW', 'CONTACTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "RealEstateSubmissionStatus" AS ENUM ('PENDING', 'REVIEWED', 'APPROVED', 'REJECTED', 'CONVERTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AdminNotificationEventType" ADD VALUE 'REAL_ESTATE_OWNER_SUBMISSION_CREATED';
ALTER TYPE "AdminNotificationEventType" ADD VALUE 'REAL_ESTATE_INQUIRY_CREATED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AdminNotificationEntityType" ADD VALUE 'REAL_ESTATE_INQUIRY';
ALTER TYPE "AdminNotificationEntityType" ADD VALUE 'REAL_ESTATE_OWNER_SUBMISSION';
ALTER TYPE "AdminNotificationEntityType" ADD VALUE 'REAL_ESTATE_LISTING';

-- CreateTable
CREATE TABLE "real_estate_listings" (
    "id" TEXT NOT NULL,
    "compound_id" TEXT NOT NULL,
    "type" "RealEstateType" NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "RealEstateStatus" NOT NULL DEFAULT 'DRAFT',
    "price" DECIMAL(12,2) NOT NULL,
    "area_sqm" DECIMAL(10,2) NOT NULL,
    "description" TEXT NOT NULL,
    "features" JSONB,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "published_at" TIMESTAMP(3),
    "owner_name" TEXT NOT NULL,
    "owner_phone" TEXT NOT NULL,
    "owner_whatsapp" TEXT,
    "owner_email" TEXT,
    "internal_notes" TEXT,
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "floor" INTEGER,
    "building_number" TEXT,
    "apartment_number" TEXT,
    "finishing_type" "RealEstateFinishing",
    "delivery_status" TEXT,
    "has_elevator" BOOLEAN,
    "has_parking" BOOLEAN,
    "view" TEXT,
    "price_per_meter" DECIMAL(12,2),
    "frontage" DECIMAL(10,2),
    "depth" DECIMAL(10,2),
    "street_width" DECIMAL(10,2),
    "land_use" TEXT,
    "utilities_available" BOOLEAN,
    "corner_plot" BOOLEAN,
    "is_registered" BOOLEAN,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "real_estate_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "real_estate_listing_images" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "public_id" TEXT,
    "alt" TEXT,
    "is_cover" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "real_estate_listing_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "real_estate_owner_submissions" (
    "id" TEXT NOT NULL,
    "compound_id" TEXT NOT NULL,
    "submitter_name" TEXT NOT NULL,
    "submitter_phone" TEXT NOT NULL,
    "submitter_whatsapp" TEXT,
    "submitter_email" TEXT,
    "type" "RealEstateType" NOT NULL,
    "title" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "area_sqm" DECIMAL(10,2) NOT NULL,
    "description" TEXT NOT NULL,
    "features" JSONB,
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "floor" INTEGER,
    "building_number" TEXT,
    "apartment_number" TEXT,
    "finishing_type" "RealEstateFinishing",
    "has_elevator" BOOLEAN,
    "has_parking" BOOLEAN,
    "price_per_meter" DECIMAL(12,2),
    "frontage" DECIMAL(10,2),
    "depth" DECIMAL(10,2),
    "street_width" DECIMAL(10,2),
    "land_use" TEXT,
    "utilities_available" BOOLEAN,
    "corner_plot" BOOLEAN,
    "is_registered" BOOLEAN,
    "status" "RealEstateSubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "admin_notes" TEXT,
    "created_listing_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "real_estate_owner_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "real_estate_submission_images" (
    "id" TEXT NOT NULL,
    "submission_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "public_id" TEXT,
    "alt" TEXT,
    "is_cover" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "real_estate_submission_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "real_estate_inquiries" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "customer_phone" TEXT NOT NULL,
    "customer_whatsapp" TEXT,
    "inquiry_type" "RealEstateInquiryType" NOT NULL,
    "message" TEXT,
    "status" "RealEstateInquiryStatus" NOT NULL DEFAULT 'NEW',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "real_estate_inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "real_estate_listings_slug_key" ON "real_estate_listings"("slug");

-- CreateIndex
CREATE INDEX "real_estate_listings_compound_id_idx" ON "real_estate_listings"("compound_id");

-- CreateIndex
CREATE INDEX "real_estate_listings_status_idx" ON "real_estate_listings"("status");

-- CreateIndex
CREATE INDEX "real_estate_listings_type_idx" ON "real_estate_listings"("type");

-- CreateIndex
CREATE INDEX "real_estate_listings_type_status_idx" ON "real_estate_listings"("type", "status");

-- CreateIndex
CREATE INDEX "real_estate_listings_is_featured_idx" ON "real_estate_listings"("is_featured");

-- CreateIndex
CREATE INDEX "real_estate_listings_sort_order_idx" ON "real_estate_listings"("sort_order");

-- CreateIndex
CREATE INDEX "real_estate_listing_images_listing_id_idx" ON "real_estate_listing_images"("listing_id");

-- CreateIndex
CREATE INDEX "real_estate_listing_images_is_cover_idx" ON "real_estate_listing_images"("is_cover");

-- CreateIndex
CREATE UNIQUE INDEX "real_estate_owner_submissions_created_listing_id_key" ON "real_estate_owner_submissions"("created_listing_id");

-- CreateIndex
CREATE INDEX "real_estate_owner_submissions_compound_id_idx" ON "real_estate_owner_submissions"("compound_id");

-- CreateIndex
CREATE INDEX "real_estate_owner_submissions_status_idx" ON "real_estate_owner_submissions"("status");

-- CreateIndex
CREATE INDEX "real_estate_owner_submissions_type_idx" ON "real_estate_owner_submissions"("type");

-- CreateIndex
CREATE INDEX "real_estate_submission_images_submission_id_idx" ON "real_estate_submission_images"("submission_id");

-- CreateIndex
CREATE INDEX "real_estate_inquiries_listing_id_idx" ON "real_estate_inquiries"("listing_id");

-- CreateIndex
CREATE INDEX "real_estate_inquiries_status_idx" ON "real_estate_inquiries"("status");

-- AddForeignKey
ALTER TABLE "real_estate_listings" ADD CONSTRAINT "real_estate_listings_compound_id_fkey" FOREIGN KEY ("compound_id") REFERENCES "compounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "real_estate_listing_images" ADD CONSTRAINT "real_estate_listing_images_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "real_estate_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "real_estate_owner_submissions" ADD CONSTRAINT "real_estate_owner_submissions_compound_id_fkey" FOREIGN KEY ("compound_id") REFERENCES "compounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "real_estate_submission_images" ADD CONSTRAINT "real_estate_submission_images_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "real_estate_owner_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "real_estate_inquiries" ADD CONSTRAINT "real_estate_inquiries_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "real_estate_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

