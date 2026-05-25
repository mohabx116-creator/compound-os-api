-- AlterTable
ALTER TABLE "compounds" ADD COLUMN "code" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "compounds_code_key" ON "compounds"("code");
