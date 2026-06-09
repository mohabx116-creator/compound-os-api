-- AlterTable
ALTER TABLE "rental_owner_submissions" ADD COLUMN "total_beds" INTEGER NOT NULL DEFAULT 4,
ADD COLUMN "duplicate_review_flag" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "review_reason" TEXT;
