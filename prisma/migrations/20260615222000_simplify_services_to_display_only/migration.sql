-- CreateEnum
CREATE TYPE "ServiceItemKind" AS ENUM ('FACILITY', 'TECHNICAL');

-- DropForeignKey
ALTER TABLE "service_items" DROP CONSTRAINT "service_items_category_id_fkey";

-- AlterTable
ALTER TABLE "service_items" 
    ALTER COLUMN "category_id" DROP NOT NULL,
    ADD COLUMN "kind" "ServiceItemKind" NOT NULL DEFAULT 'TECHNICAL',
    ADD COLUMN "short_description" TEXT,
    ADD COLUMN "images" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN "address" TEXT,
    ADD COLUMN "google_maps_url" TEXT,
    DROP COLUMN "accepts_requests";

-- AddForeignKey
ALTER TABLE "service_items" ADD CONSTRAINT "service_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "service_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DropTable
DROP TABLE "service_requests";

-- DropEnum
DROP TYPE "ServiceRequestPriority";

-- DropEnum
DROP TYPE "ServiceRequestStatus";
