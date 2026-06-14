-- CreateEnum
CREATE TYPE "RentalTenantStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "rental_tenants" (
    "id" TEXT NOT NULL,
    "compound_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "national_id" TEXT,
    "status" "RentalTenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "inquiry_id" TEXT,
    "reservation_id" TEXT,
    "listing_id" TEXT NOT NULL,
    "unit_id" TEXT,
    "bed_id" TEXT,
    "owner_id" TEXT,
    "building_number" TEXT,
    "apartment_number" TEXT,
    "bed_number" INTEGER,
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "deactivated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rental_tenants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rental_tenants_inquiry_id_key" ON "rental_tenants"("inquiry_id");

-- CreateIndex
CREATE UNIQUE INDEX "rental_tenants_reservation_id_key" ON "rental_tenants"("reservation_id");

-- CreateIndex
CREATE INDEX "rental_tenants_compound_id_idx" ON "rental_tenants"("compound_id");

-- CreateIndex
CREATE INDEX "rental_tenants_listing_id_idx" ON "rental_tenants"("listing_id");

-- CreateIndex
CREATE INDEX "rental_tenants_owner_id_idx" ON "rental_tenants"("owner_id");

-- CreateIndex
CREATE INDEX "rental_tenants_status_idx" ON "rental_tenants"("status");

-- CreateIndex
CREATE INDEX "rental_tenants_phone_idx" ON "rental_tenants"("phone");

-- AddForeignKey
ALTER TABLE "rental_tenants" ADD CONSTRAINT "rental_tenants_compound_id_fkey" FOREIGN KEY ("compound_id") REFERENCES "compounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_tenants" ADD CONSTRAINT "rental_tenants_inquiry_id_fkey" FOREIGN KEY ("inquiry_id") REFERENCES "rental_inquiries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_tenants" ADD CONSTRAINT "rental_tenants_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "rental_reservations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_tenants" ADD CONSTRAINT "rental_tenants_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "rental_listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_tenants" ADD CONSTRAINT "rental_tenants_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_tenants" ADD CONSTRAINT "rental_tenants_bed_id_fkey" FOREIGN KEY ("bed_id") REFERENCES "rental_beds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_tenants" ADD CONSTRAINT "rental_tenants_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "rental_owners"("id") ON DELETE SET NULL ON UPDATE CASCADE;
