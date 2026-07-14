-- CreateEnum
CREATE TYPE "RatingFeedbackType" AS ENUM ('SITE_EXPERIENCE', 'SERVICE', 'REAL_ESTATE', 'RENTAL');

-- CreateEnum
CREATE TYPE "RatingFeedbackStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SPAM');

-- CreateTable
CREATE TABLE "rating_feedbacks" (
    "id" TEXT NOT NULL,
    "feedback_type" "RatingFeedbackType" NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" VARCHAR(1000),
    "source_page" VARCHAR(255),
    "prompt_version" VARCHAR(50) NOT NULL DEFAULT 'site-rating-v1',
    "client_interaction_ms" INTEGER,
    "ip_hash" VARCHAR(128),
    "visitor_token_hash" VARCHAR(128),
    "user_agent_hash" VARCHAR(128),
    "status" "RatingFeedbackStatus" NOT NULL DEFAULT 'PENDING',
    "spam_reason" VARCHAR(255),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rating_feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rating_feedbacks_feedback_type_status_created_at_idx" ON "rating_feedbacks"("feedback_type", "status", "created_at");

-- CreateIndex
CREATE INDEX "rating_feedbacks_status_created_at_idx" ON "rating_feedbacks"("status", "created_at");

-- CreateIndex
CREATE INDEX "rating_feedbacks_ip_hash_feedback_type_created_at_idx" ON "rating_feedbacks"("ip_hash", "feedback_type", "created_at");

-- CreateIndex
CREATE INDEX "rating_feedbacks_visitor_token_hash_feedback_type_created_a_idx" ON "rating_feedbacks"("visitor_token_hash", "feedback_type", "created_at");

-- CreateIndex
CREATE INDEX "rating_feedbacks_created_at_idx" ON "rating_feedbacks"("created_at");

