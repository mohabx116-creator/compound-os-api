import type { RatingFeedbackType } from '@prisma/client';

export const publicRatingFeedbackTypes = ['SITE_EXPERIENCE'] as const;
export type PublicRatingFeedbackType = (typeof publicRatingFeedbackTypes)[number];

export interface SubmitRatingInput {
  type: PublicRatingFeedbackType;
  rating: number;
  comment?: string | null;
  sourcePage?: string;
  promptVersion?: string;
  honeypot?: string;
  clientInteractionMs?: number;
  visitorToken?: string;
}

export interface RatingSummaryQuery {
  type: PublicRatingFeedbackType;
}

export interface RatingDistribution {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}

export interface PublicRatingSummary {
  type: RatingFeedbackType;
  averageRating: number | null;
  ratingsCount: number;
  distribution: RatingDistribution;
  hasEnoughRatings: boolean;
  updatedAt: string;
}
