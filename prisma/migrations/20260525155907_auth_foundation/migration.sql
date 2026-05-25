-- AlterTable
ALTER TABLE "residents" ADD COLUMN     "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "is_email_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "last_login_at" TIMESTAMP(3),
ADD COLUMN     "locked_until" TIMESTAMP(3),
ADD COLUMN     "password_changed_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "residents_email_idx" ON "residents"("email");

-- CreateIndex
CREATE INDEX "residents_compound_id_email_idx" ON "residents"("compound_id", "email");
