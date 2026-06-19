-- Delete real-estate notifications before altering enum
DELETE FROM "admin_notifications" WHERE "event_type" IN ('REAL_ESTATE_OWNER_SUBMISSION_CREATED', 'REAL_ESTATE_INQUIRY_CREATED');
DELETE FROM "admin_notifications" WHERE "entity_type" IN ('REAL_ESTATE_INQUIRY', 'REAL_ESTATE_OWNER_SUBMISSION', 'REAL_ESTATE_LISTING');
-- AlterEnum
BEGIN;
CREATE TYPE "AdminNotificationEventType_new" AS ENUM ('RENTAL_INQUIRY_CREATED', 'RENTAL_OWNER_SUBMISSION_CREATED', 'RENTAL_INQUIRY_APPROVED', 'RENTAL_INQUIRY_CANCELLED', 'RENTAL_OWNER_SUBMISSION_APPROVED', 'RENTAL_OWNER_SUBMISSION_REJECTED', 'SYSTEM');
ALTER TABLE "admin_notifications" ALTER COLUMN "event_type" TYPE "AdminNotificationEventType_new" USING ("event_type"::text::"AdminNotificationEventType_new");
ALTER TYPE "AdminNotificationEventType" RENAME TO "AdminNotificationEventType_old";
ALTER TYPE "AdminNotificationEventType_new" RENAME TO "AdminNotificationEventType";
DROP TYPE "AdminNotificationEventType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "AdminNotificationEntityType_new" AS ENUM ('RENTAL_INQUIRY', 'RENTAL_OWNER_SUBMISSION', 'RENTAL_LISTING', 'RENTAL_TENANT', 'SYSTEM');
ALTER TABLE "admin_notifications" ALTER COLUMN "entity_type" TYPE "AdminNotificationEntityType_new" USING ("entity_type"::text::"AdminNotificationEntityType_new");
ALTER TYPE "AdminNotificationEntityType" RENAME TO "AdminNotificationEntityType_old";
ALTER TYPE "AdminNotificationEntityType_new" RENAME TO "AdminNotificationEntityType";
DROP TYPE "AdminNotificationEntityType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "real_estate_listings" DROP CONSTRAINT "real_estate_listings_compound_id_fkey";

-- DropForeignKey
ALTER TABLE "real_estate_listing_images" DROP CONSTRAINT "real_estate_listing_images_listing_id_fkey";

-- DropForeignKey
ALTER TABLE "real_estate_owner_submissions" DROP CONSTRAINT "real_estate_owner_submissions_compound_id_fkey";

-- DropForeignKey
ALTER TABLE "real_estate_submission_images" DROP CONSTRAINT "real_estate_submission_images_submission_id_fkey";

-- DropForeignKey
ALTER TABLE "real_estate_inquiries" DROP CONSTRAINT "real_estate_inquiries_listing_id_fkey";

-- DropTable
DROP TABLE "real_estate_listings";

-- DropTable
DROP TABLE "real_estate_listing_images";

-- DropTable
DROP TABLE "real_estate_owner_submissions";

-- DropTable
DROP TABLE "real_estate_submission_images";

-- DropTable
DROP TABLE "real_estate_inquiries";

-- DropEnum
DROP TYPE "RealEstateType";

-- DropEnum
DROP TYPE "RealEstateStatus";

-- DropEnum
DROP TYPE "RealEstateFinishing";

-- DropEnum
DROP TYPE "RealEstateInquiryType";

-- DropEnum
DROP TYPE "RealEstateInquiryStatus";

-- DropEnum
DROP TYPE "RealEstateSubmissionStatus";

