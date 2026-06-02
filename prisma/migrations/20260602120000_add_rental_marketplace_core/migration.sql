-- CreateEnum
CREATE TYPE "RentalListingStatus" AS ENUM ('DRAFT', 'PENDING_PAYMENT', 'PENDING_REVIEW', 'ACTIVE', 'PAYMENT_LOCKED', 'RESERVED', 'RENTED', 'EXPIRED', 'SUSPENDED', 'REJECTED', 'REMOVED');

-- CreateEnum
CREATE TYPE "RentalListingType" AS ENUM ('APARTMENT', 'VILLA', 'STUDIO', 'DUPLEX', 'OFFICE', 'SHOP');

-- CreateEnum
CREATE TYPE "RentalFurnishingStatus" AS ENUM ('UNFURNISHED', 'SEMI_FURNISHED', 'FURNISHED');

-- CreateEnum
CREATE TYPE "RentalPaymentPurpose" AS ENUM ('OWNER_LISTING_FEE', 'TENANT_CONTACT_UNLOCK', 'TENANT_RESERVATION_HOLD', 'RENTAL_FINAL_PAYMENT', 'PLATFORM_COMMISSION', 'OWNER_PAYOUT');

-- CreateEnum
CREATE TYPE "RentalPaymentStatus" AS ENUM ('INITIATED', 'PENDING', 'PAID', 'FAILED', 'EXPIRED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "RentalReservationStatus" AS ENUM ('PENDING_PAYMENT', 'PAYMENT_LOCKED', 'PAID_PENDING_CONFIRMATION', 'RESERVED', 'CONFIRMED', 'CANCELLED', 'EXPIRED', 'REFUNDED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RentalInquiryStatus" AS ENUM ('NEW', 'CONTACT_UNLOCKED', 'VIEWING_REQUESTED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RentalOwnerStatus" AS ENUM ('PENDING_REVIEW', 'ACTIVE', 'SUSPENDED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('PAYMOB');

-- CreateTable
CREATE TABLE "rental_owners" (
    "id" TEXT NOT NULL,
    "compound_id" TEXT NOT NULL,
    "resident_id" TEXT,
    "full_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "national_id" TEXT,
    "status" "RentalOwnerStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rental_owners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental_listings" (
    "id" TEXT NOT NULL,
    "compound_id" TEXT NOT NULL,
    "unit_id" TEXT,
    "owner_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "listing_type" "RentalListingType" NOT NULL,
    "furnishing_status" "RentalFurnishingStatus" NOT NULL,
    "bedrooms" INTEGER NOT NULL,
    "bathrooms" INTEGER NOT NULL,
    "area_sqm" DECIMAL(10,2) NOT NULL,
    "floor" INTEGER,
    "monthly_rent" DECIMAL(12,2) NOT NULL,
    "deposit_amount" DECIMAL(12,2),
    "contact_unlock_fee" DECIMAL(12,2) NOT NULL DEFAULT 100.00,
    "reservation_fee" DECIMAL(12,2) NOT NULL DEFAULT 1000.00,
    "platform_commission_rate" DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    "status" "RentalListingStatus" NOT NULL DEFAULT 'DRAFT',
    "address_text" TEXT,
    "location_text" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "reserved_until" TIMESTAMP(3),
    "rented_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rental_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental_listing_images" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt_text" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_cover" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rental_listing_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental_inquiries" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "compound_id" TEXT NOT NULL,
    "tenant_resident_id" TEXT,
    "tenant_name" TEXT NOT NULL,
    "tenant_phone" TEXT NOT NULL,
    "tenant_email" TEXT,
    "message" TEXT,
    "status" "RentalInquiryStatus" NOT NULL DEFAULT 'NEW',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rental_inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental_contact_unlocks" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "compound_id" TEXT NOT NULL,
    "tenant_resident_id" TEXT,
    "tenant_name" TEXT NOT NULL,
    "tenant_phone" TEXT NOT NULL,
    "tenant_email" TEXT,
    "payment_id" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "status" "RentalPaymentStatus" NOT NULL DEFAULT 'INITIATED',
    "unlocked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rental_contact_unlocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental_reservations" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "compound_id" TEXT NOT NULL,
    "tenant_resident_id" TEXT,
    "tenant_name" TEXT NOT NULL,
    "tenant_phone" TEXT NOT NULL,
    "tenant_email" TEXT,
    "payment_id" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "status" "RentalReservationStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "reserved_until" TIMESTAMP(3),
    "confirmed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "expired_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rental_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental_payments" (
    "id" TEXT NOT NULL,
    "compound_id" TEXT NOT NULL,
    "listing_id" TEXT,
    "reservation_id" TEXT,
    "contact_unlock_id" TEXT,
    "purpose" "RentalPaymentPurpose" NOT NULL,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'PAYMOB',
    "provider_order_id" TEXT,
    "provider_transaction_id" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "status" "RentalPaymentStatus" NOT NULL DEFAULT 'INITIATED',
    "idempotency_key" TEXT,
    "payment_url" TEXT,
    "raw_provider_payload" JSONB,
    "paid_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "refunded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rental_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental_platform_ledger_entries" (
    "id" TEXT NOT NULL,
    "compound_id" TEXT NOT NULL,
    "listing_id" TEXT,
    "reservation_id" TEXT,
    "payment_id" TEXT,
    "entry_type" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rental_platform_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rental_owners_compound_id_idx" ON "rental_owners"("compound_id");

-- CreateIndex
CREATE INDEX "rental_owners_phone_idx" ON "rental_owners"("phone");

-- CreateIndex
CREATE INDEX "rental_owners_status_idx" ON "rental_owners"("status");

-- CreateIndex
CREATE UNIQUE INDEX "rental_owners_compound_id_phone_key" ON "rental_owners"("compound_id", "phone");

-- CreateIndex
CREATE INDEX "rental_listings_compound_id_idx" ON "rental_listings"("compound_id");

-- CreateIndex
CREATE INDEX "rental_listings_owner_id_idx" ON "rental_listings"("owner_id");

-- CreateIndex
CREATE INDEX "rental_listings_unit_id_idx" ON "rental_listings"("unit_id");

-- CreateIndex
CREATE INDEX "rental_listings_status_idx" ON "rental_listings"("status");

-- CreateIndex
CREATE INDEX "rental_listings_slug_idx" ON "rental_listings"("slug");

-- CreateIndex
CREATE INDEX "rental_listings_is_published_idx" ON "rental_listings"("is_published");

-- CreateIndex
CREATE INDEX "rental_listings_is_featured_idx" ON "rental_listings"("is_featured");

-- CreateIndex
CREATE INDEX "rental_listings_monthly_rent_idx" ON "rental_listings"("monthly_rent");

-- CreateIndex
CREATE INDEX "rental_listings_created_at_idx" ON "rental_listings"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "rental_listings_slug_key" ON "rental_listings"("slug");

-- CreateIndex
CREATE INDEX "rental_listing_images_listing_id_idx" ON "rental_listing_images"("listing_id");

-- CreateIndex
CREATE INDEX "rental_listing_images_is_cover_idx" ON "rental_listing_images"("is_cover");

-- CreateIndex
CREATE INDEX "rental_listing_images_sort_order_idx" ON "rental_listing_images"("sort_order");

-- CreateIndex
CREATE INDEX "rental_inquiries_listing_id_idx" ON "rental_inquiries"("listing_id");

-- CreateIndex
CREATE INDEX "rental_inquiries_compound_id_idx" ON "rental_inquiries"("compound_id");

-- CreateIndex
CREATE INDEX "rental_inquiries_tenant_phone_idx" ON "rental_inquiries"("tenant_phone");

-- CreateIndex
CREATE INDEX "rental_inquiries_status_idx" ON "rental_inquiries"("status");

-- CreateIndex
CREATE INDEX "rental_contact_unlocks_listing_id_idx" ON "rental_contact_unlocks"("listing_id");

-- CreateIndex
CREATE INDEX "rental_contact_unlocks_compound_id_idx" ON "rental_contact_unlocks"("compound_id");

-- CreateIndex
CREATE INDEX "rental_contact_unlocks_tenant_phone_idx" ON "rental_contact_unlocks"("tenant_phone");

-- CreateIndex
CREATE INDEX "rental_contact_unlocks_status_idx" ON "rental_contact_unlocks"("status");

-- CreateIndex
CREATE UNIQUE INDEX "rental_contact_unlocks_listing_id_tenant_phone_key" ON "rental_contact_unlocks"("listing_id", "tenant_phone");

-- CreateIndex
CREATE INDEX "rental_reservations_listing_id_idx" ON "rental_reservations"("listing_id");

-- CreateIndex
CREATE INDEX "rental_reservations_compound_id_idx" ON "rental_reservations"("compound_id");

-- CreateIndex
CREATE INDEX "rental_reservations_tenant_phone_idx" ON "rental_reservations"("tenant_phone");

-- CreateIndex
CREATE INDEX "rental_reservations_status_idx" ON "rental_reservations"("status");

-- CreateIndex
CREATE INDEX "rental_reservations_reserved_until_idx" ON "rental_reservations"("reserved_until");

-- CreateIndex
CREATE INDEX "rental_reservations_listing_id_status_reserved_until_idx" ON "rental_reservations"("listing_id", "status", "reserved_until");

-- CreateIndex
CREATE INDEX "rental_payments_compound_id_idx" ON "rental_payments"("compound_id");

-- CreateIndex
CREATE INDEX "rental_payments_listing_id_idx" ON "rental_payments"("listing_id");

-- CreateIndex
CREATE INDEX "rental_payments_reservation_id_idx" ON "rental_payments"("reservation_id");

-- CreateIndex
CREATE INDEX "rental_payments_contact_unlock_id_idx" ON "rental_payments"("contact_unlock_id");

-- CreateIndex
CREATE INDEX "rental_payments_provider_idx" ON "rental_payments"("provider");

-- CreateIndex
CREATE INDEX "rental_payments_provider_order_id_idx" ON "rental_payments"("provider_order_id");

-- CreateIndex
CREATE INDEX "rental_payments_provider_transaction_id_idx" ON "rental_payments"("provider_transaction_id");

-- CreateIndex
CREATE INDEX "rental_payments_status_idx" ON "rental_payments"("status");

-- CreateIndex
CREATE INDEX "rental_payments_purpose_idx" ON "rental_payments"("purpose");

-- CreateIndex
CREATE UNIQUE INDEX "rental_payments_idempotency_key_key" ON "rental_payments"("idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "rental_payments_provider_provider_transaction_id_key" ON "rental_payments"("provider", "provider_transaction_id");

-- CreateIndex
CREATE INDEX "rental_platform_ledger_entries_compound_id_idx" ON "rental_platform_ledger_entries"("compound_id");

-- CreateIndex
CREATE INDEX "rental_platform_ledger_entries_listing_id_idx" ON "rental_platform_ledger_entries"("listing_id");

-- CreateIndex
CREATE INDEX "rental_platform_ledger_entries_reservation_id_idx" ON "rental_platform_ledger_entries"("reservation_id");

-- CreateIndex
CREATE INDEX "rental_platform_ledger_entries_payment_id_idx" ON "rental_platform_ledger_entries"("payment_id");

-- AddForeignKey
ALTER TABLE "rental_owners" ADD CONSTRAINT "rental_owners_compound_id_fkey" FOREIGN KEY ("compound_id") REFERENCES "compounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_owners" ADD CONSTRAINT "rental_owners_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "residents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_listings" ADD CONSTRAINT "rental_listings_compound_id_fkey" FOREIGN KEY ("compound_id") REFERENCES "compounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_listings" ADD CONSTRAINT "rental_listings_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_listings" ADD CONSTRAINT "rental_listings_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "rental_owners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_listing_images" ADD CONSTRAINT "rental_listing_images_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "rental_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_inquiries" ADD CONSTRAINT "rental_inquiries_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "rental_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_inquiries" ADD CONSTRAINT "rental_inquiries_compound_id_fkey" FOREIGN KEY ("compound_id") REFERENCES "compounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_inquiries" ADD CONSTRAINT "rental_inquiries_tenant_resident_id_fkey" FOREIGN KEY ("tenant_resident_id") REFERENCES "residents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_contact_unlocks" ADD CONSTRAINT "rental_contact_unlocks_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "rental_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_contact_unlocks" ADD CONSTRAINT "rental_contact_unlocks_compound_id_fkey" FOREIGN KEY ("compound_id") REFERENCES "compounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_contact_unlocks" ADD CONSTRAINT "rental_contact_unlocks_tenant_resident_id_fkey" FOREIGN KEY ("tenant_resident_id") REFERENCES "residents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_reservations" ADD CONSTRAINT "rental_reservations_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "rental_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_reservations" ADD CONSTRAINT "rental_reservations_compound_id_fkey" FOREIGN KEY ("compound_id") REFERENCES "compounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_reservations" ADD CONSTRAINT "rental_reservations_tenant_resident_id_fkey" FOREIGN KEY ("tenant_resident_id") REFERENCES "residents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_payments" ADD CONSTRAINT "rental_payments_compound_id_fkey" FOREIGN KEY ("compound_id") REFERENCES "compounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_payments" ADD CONSTRAINT "rental_payments_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "rental_listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_payments" ADD CONSTRAINT "rental_payments_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "rental_reservations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_payments" ADD CONSTRAINT "rental_payments_contact_unlock_id_fkey" FOREIGN KEY ("contact_unlock_id") REFERENCES "rental_contact_unlocks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_platform_ledger_entries" ADD CONSTRAINT "rental_platform_ledger_entries_compound_id_fkey" FOREIGN KEY ("compound_id") REFERENCES "compounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_platform_ledger_entries" ADD CONSTRAINT "rental_platform_ledger_entries_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "rental_listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_platform_ledger_entries" ADD CONSTRAINT "rental_platform_ledger_entries_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "rental_reservations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_platform_ledger_entries" ADD CONSTRAINT "rental_platform_ledger_entries_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "rental_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
