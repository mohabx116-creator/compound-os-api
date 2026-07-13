import crypto from 'crypto';
import { Prisma, RatingFeedbackStatus, RatingFeedbackType } from '@prisma/client';
import { Request } from 'express';
import { AppError } from '../../common/errors/AppError.js';
import { ErrorCodes } from '../../common/errors/error-codes.js';
import { env } from '../../config/env.js';
import { prisma } from '../../config/prisma.js';
import type { PublicRatingSummary, RatingSummaryQuery, SubmitRatingInput } from './ratings.types.js';

const PUBLIC_RATING_TYPE: RatingFeedbackType = RatingFeedbackType.SITE_EXPERIENCE;
const MIN_INTERACTION_MS_FOR_TRUST = 3000;
const VISITOR_DEDUPE_WINDOW_DAYS = 60;
const IP_DEDUPE_WINDOW_HOURS = 24;
const PUBLIC_MIN_RATINGS_FOR_AVERAGE = 5;
const FALLBACK_HASH_SALT = 'compound-os-rating-feedback-dev-salt';

function getRatingHashSalt() {
  if (env.JWT_SECRET) {
    return env.JWT_SECRET;
  }

  if (env.NODE_ENV === 'production') {
    throw new AppError(
      'Rating submission is temporarily unavailable',
      503,
      ErrorCodes.SERVICE_UNAVAILABLE,
    );
  }

  return FALLBACK_HASH_SALT;
}

function cleanString(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function cleanComment(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function clientIp(req: Request) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0]?.trim() || req.ip || req.socket.remoteAddress || 'unknown';
  }

  return req.ip || req.socket.remoteAddress || 'unknown';
}

function hashValue(salt: string, value: string) {
  return crypto
    .createHash('sha256')
    .update(`${salt}:${value}`)
    .digest('hex');
}

function buildDistribution() {
  return {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };
}

export class RatingsService {
  static async submitSiteRating(req: Request, input: SubmitRatingInput) {
    if (input.type !== PUBLIC_RATING_TYPE) {
      throw new AppError('Unsupported rating type', 400, ErrorCodes.BAD_REQUEST);
    }

    const ratingHashSalt = getRatingHashSalt();
    const now = new Date();
    const ip = clientIp(req);
    const ipHash = hashValue(ratingHashSalt, ip);
    const visitorToken = cleanString(input.visitorToken);
    const visitorTokenHash = visitorToken ? hashValue(ratingHashSalt, visitorToken) : null;
    const userAgent = cleanString(req.header('user-agent'));
    const userAgentHash = userAgent ? hashValue(ratingHashSalt, userAgent) : null;
    const sourcePage = cleanString(input.sourcePage) ?? '/';
    const promptVersion = cleanString(input.promptVersion) ?? 'site-rating-v1';
    const comment = cleanComment(input.comment);
    const honeypot = cleanString(input.honeypot);
    const clientInteractionMs = input.clientInteractionMs ?? null;

    const isSpam = Boolean(honeypot) || (typeof clientInteractionMs === 'number' && clientInteractionMs < MIN_INTERACTION_MS_FOR_TRUST);

    const duplicateWhere: Prisma.RatingFeedbackWhereInput = visitorTokenHash
      ? {
          type: PUBLIC_RATING_TYPE,
          visitorTokenHash,
          createdAt: {
            gte: new Date(now.getTime() - VISITOR_DEDUPE_WINDOW_DAYS * 24 * 60 * 60 * 1000),
          },
        }
      : {
          type: PUBLIC_RATING_TYPE,
          ipHash,
          createdAt: {
            gte: new Date(now.getTime() - IP_DEDUPE_WINDOW_HOURS * 60 * 60 * 1000),
          },
        };

    const duplicate = await prisma.ratingFeedback.findFirst({
      where: duplicateWhere,
      select: { id: true },
    });

    if (duplicate) {
      return { stored: false, duplicate: true };
    }

    try {
      await prisma.ratingFeedback.create({
        data: {
          type: PUBLIC_RATING_TYPE,
          rating: input.rating,
          comment,
          sourcePage,
          promptVersion,
          clientInteractionMs,
          ipHash,
          visitorTokenHash,
          userAgentHash,
          status: isSpam ? RatingFeedbackStatus.SPAM : RatingFeedbackStatus.APPROVED,
          spamReason: isSpam ? (honeypot ? 'HONEYPOT_FILLED' : 'TOO_FAST_SUBMISSION') : null,
        },
      });

      return { stored: true, duplicate: false };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return { stored: false, duplicate: true };
      }

      throw error;
    }
  }

  static async getPublicSummary(query: RatingSummaryQuery): Promise<PublicRatingSummary> {
    if (query.type !== 'SITE_EXPERIENCE') {
      throw new AppError('Unsupported rating type', 400, ErrorCodes.BAD_REQUEST);
    }

    const where: Prisma.RatingFeedbackWhereInput = {
      type: PUBLIC_RATING_TYPE,
      status: RatingFeedbackStatus.APPROVED,
    };

    const [ratingsCount, distributionRowsRaw, latestRating, averageResult] = await prisma.$transaction([
      prisma.ratingFeedback.count({ where }),
      prisma.ratingFeedback.groupBy({
        by: ['rating'],
        where,
        orderBy: { rating: 'asc' },
        _count: { _all: true },
      }),
      prisma.ratingFeedback.findFirst({
        where,
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
      prisma.ratingFeedback.aggregate({
        where,
        _avg: { rating: true },
      }),
    ]);

    const distributionRows = distributionRowsRaw as Array<{
      rating: number;
      _count: { _all: number };
    }>;

    const distribution = buildDistribution();
    for (const row of distributionRows) {
      if (row.rating >= 1 && row.rating <= 5) {
        distribution[row.rating as 1 | 2 | 3 | 4 | 5] = row._count._all;
      }
    }

    const averageRating = ratingsCount >= PUBLIC_MIN_RATINGS_FOR_AVERAGE
      ? (averageResult._avg.rating ? Math.round(averageResult._avg.rating * 10) / 10 : null)
      : null;

    return {
      type: PUBLIC_RATING_TYPE,
      averageRating,
      ratingsCount,
      distribution,
      hasEnoughRatings: ratingsCount >= PUBLIC_MIN_RATINGS_FOR_AVERAGE,
      updatedAt: (latestRating?.createdAt ?? new Date()).toISOString(),
    };
  }
}
