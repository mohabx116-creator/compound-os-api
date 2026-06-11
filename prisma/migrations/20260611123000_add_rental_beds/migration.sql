-- CreateEnum
CREATE TYPE "RentalBedStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'RENTED', 'OUT_OF_SERVICE');

-- CreateTable
CREATE TABLE "rental_beds" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "bed_number" INTEGER NOT NULL,
    "status" "RentalBedStatus" NOT NULL DEFAULT 'AVAILABLE',
    "inquiry_id" TEXT,
    "reservation_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rental_beds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rental_beds_listing_id_bed_number_key" ON "rental_beds"("listing_id", "bed_number");

-- CreateIndex
CREATE INDEX "rental_beds_listing_id_idx" ON "rental_beds"("listing_id");

-- CreateIndex
CREATE INDEX "rental_beds_status_idx" ON "rental_beds"("status");

-- CreateIndex
CREATE INDEX "rental_beds_inquiry_id_idx" ON "rental_beds"("inquiry_id");

-- CreateIndex
CREATE INDEX "rental_beds_reservation_id_idx" ON "rental_beds"("reservation_id");

-- AddForeignKey
ALTER TABLE "rental_beds" ADD CONSTRAINT "rental_beds_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "rental_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill existing listings
DO $$
DECLARE
    r RECORD;
    i INT;
    bed_id TEXT;
    t_beds INT;
    r_beds INT;
    p_beds INT;
    bed_status "RentalBedStatus";
BEGIN
    FOR r IN SELECT id, COALESCE(total_beds, 4) as tb, COALESCE(rented_beds, 0) as rb, COALESCE(pending_beds, 0) as pb FROM rental_listings LOOP
        t_beds := r.tb;
        r_beds := r.rb;
        p_beds := r.pb;
        
        -- Defensive checks
        IF t_beds < 0 THEN
            t_beds := 0;
        END IF;
        IF r_beds < 0 THEN
            r_beds := 0;
        END IF;
        IF p_beds < 0 THEN
            p_beds := 0;
        END IF;
        
        -- Cap rented beds to total_beds
        IF r_beds > t_beds THEN
            r_beds := t_beds;
        END IF;
        -- Cap pending beds to remaining space
        IF r_beds + p_beds > t_beds THEN
            p_beds := t_beds - r_beds;
        END IF;
        
        FOR i IN 1..t_beds LOOP
            -- Determine status
            IF i <= r_beds THEN
                bed_status := 'RENTED';
            ELSIF i <= r_beds + p_beds THEN
                bed_status := 'RESERVED';
            ELSE
                bed_status := 'AVAILABLE';
            END IF;
            
            -- Generate cuid-like format (e.g. prefix + md5 hash)
            bed_id := 'bed_' || md5(r.id || i::text || random()::text);
            
            INSERT INTO "rental_beds" ("id", "listing_id", "bed_number", "status", "created_at", "updated_at")
            VALUES (bed_id, r.id, i, bed_status, NOW(), NOW())
            ON CONFLICT ("listing_id", "bed_number") DO NOTHING;
        END FOR;
    END FOR;
END $$;
