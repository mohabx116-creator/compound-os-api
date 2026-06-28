import {
  PlatformRevenueCategory,
  PlatformRevenueSourceType,
  Prisma,
} from '@prisma/client';
import { AppError } from '../../common/errors/AppError.js';
import { ErrorCodes } from '../../common/errors/error-codes.js';
import { getPaginationMeta, getPrismaPagination } from '../../common/utils/pagination.js';
import { prisma } from '../../config/prisma.js';
import type {
  RecordRevenueEntryInput,
  RevenueDateRange,
  RevenueEntriesResult,
  RevenueEntryListItem,
  RevenueMonthlyBucket,
  RevenueSummaryBucket,
  RevenueSummaryResult,
  RevenueWindow,
} from './platform-revenue.types.js';

const revenueEntrySelect = {
  id: true,
  sourceType: true,
  sourceId: true,
  revenueCategory: true,
  amount: true,
  unitRate: true,
  quantity: true,
  currency: true,
  description: true,
  occurredAt: true,
  createdAt: true,
  listing: {
    select: {
      id: true,
      title: true,
      slug: true,
    },
  },
  realEstateListing: {
    select: {
      id: true,
      title: true,
      slug: true,
    },
  },
  reservation: {
    select: {
      id: true,
      tenantName: true,
      status: true,
    },
  },
  payment: {
    select: {
      id: true,
      purpose: true,
      status: true,
    },
  },
} satisfies Prisma.PlatformRevenueEntrySelect;

const revenueEntrySummarySelect = {
  id: true,
  sourceType: true,
  sourceId: true,
  revenueCategory: true,
  amount: true,
  unitRate: true,
  quantity: true,
  currency: true,
  description: true,
  occurredAt: true,
  createdAt: true,
} satisfies Prisma.PlatformRevenueEntrySelect;

export class PlatformRevenueService {
  static async recordRevenueEntry(
    tx: Pick<Prisma.TransactionClient, 'platformRevenueEntry'>,
    input: RecordRevenueEntryInput,
  ) {
    const occurredAt = input.occurredAt ?? new Date();

    return tx.platformRevenueEntry.upsert({
      where: {
        sourceType_sourceId: {
          sourceType: input.sourceType,
          sourceId: input.sourceId,
        },
      },
      create: {
        compoundId: input.compoundId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        revenueCategory: input.revenueCategory,
        listingId: input.listingId ?? undefined,
        realEstateListingId: input.realEstateListingId ?? undefined,
        reservationId: input.reservationId ?? undefined,
        paymentId: input.paymentId ?? undefined,
        amount: input.amount,
        unitRate: input.unitRate,
        quantity: input.quantity,
        currency: input.currency,
        description: input.description,
        metadata: input.metadata ?? undefined,
        occurredAt,
      },
      update: {},
      select: revenueEntrySummarySelect,
    });
  }

  static async getRevenueSummary(
    compoundId: string,
    query: RevenueDateRange,
  ): Promise<RevenueSummaryResult> {
    const window = this.resolveWindow(query);
    const where = this.buildWhere(compoundId, query, window);

    const [
      totalsAggregate,
      categoryBuckets,
      monthlyAggregation,
      recentEntries,
    ] = await Promise.all([
      prisma.platformRevenueEntry.aggregate({
        where,
        _count: { _all: true },
        _sum: { amount: true, quantity: true },
      }),
      prisma.platformRevenueEntry.groupBy({
        by: ['revenueCategory'],
        where,
        _count: { _all: true },
        _sum: { amount: true, quantity: true },
      }),
      this.getMonthlyAggregation(where),
      prisma.platformRevenueEntry.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        take: 10,
        select: revenueEntrySelect,
      }),
    ]);

    return {
      filters: {
        ...query,
        startAt: window.startAt,
        endAt: window.endAt,
      },
      totals: {
        amount: Number(totalsAggregate._sum.amount ?? 0),
        count: totalsAggregate._count._all ?? 0,
        quantity: Number(totalsAggregate._sum.quantity ?? 0),
      },
      byCategory: this.normalizeCategoryBuckets(categoryBuckets),
      monthlyAggregation,
      recentEntries: recentEntries.map((entry) => this.toEntryListItem(entry)),
    };
  }

  static async listRevenueEntries(
    compoundId: string,
    query: RevenueDateRange & { page: number; limit: number },
  ): Promise<RevenueEntriesResult> {
    const window = this.resolveWindow(query);
    const where = this.buildWhere(compoundId, query, window);

    const [totalCount, entries] = await prisma.$transaction([
      prisma.platformRevenueEntry.count({ where }),
      prisma.platformRevenueEntry.findMany({
        where,
        ...getPrismaPagination(query),
        orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
        select: revenueEntrySelect,
      }),
    ]);

    return {
      entries: entries.map((entry) => this.toEntryListItem(entry)),
      meta: getPaginationMeta(query, totalCount),
    };
  }

  private static buildWhere(
    compoundId: string,
    query: RevenueDateRange & { revenueCategory?: PlatformRevenueCategory; sourceType?: PlatformRevenueSourceType },
    window: RevenueWindow,
  ): Prisma.PlatformRevenueEntryWhereInput {
    const where: Prisma.PlatformRevenueEntryWhereInput = { compoundId };

    if (window.startAt || window.endAt) {
      where.occurredAt = {
        ...(window.startAt ? { gte: window.startAt } : {}),
        ...(window.endAt ? { lt: window.endAt } : {}),
      };
    }

    if (query.revenueCategory) {
      where.revenueCategory = query.revenueCategory;
    }

    if (query.sourceType) {
      where.sourceType = query.sourceType;
    }

    return where;
  }

  private static resolveWindow(query: RevenueDateRange): RevenueWindow {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    switch (query.range) {
      case 'TODAY':
        return { startAt: startOfDay, endAt: new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000) };
      case 'MONTH':
        return { startAt: startOfMonth, endAt: now };
      case 'YEAR':
        return { startAt: startOfYear, endAt: now };
      case 'CUSTOM':
        return {
          startAt: query.from ? new Date(query.from) : null,
          endAt: query.to ? new Date(query.to) : null,
        };
      case 'ALL':
      default:
        return { startAt: null, endAt: null };
    }
  }

  private static normalizeCategoryBuckets(
    buckets: Array<{
      revenueCategory: PlatformRevenueCategory;
      _count: { _all: number };
      _sum: { amount: Prisma.Decimal | null; quantity: Prisma.Decimal | null };
    }>,
  ): Array<RevenueSummaryBucket & { revenueCategory: PlatformRevenueCategory }> {
    const bucketMap = new Map<PlatformRevenueCategory, RevenueSummaryBucket>();

    for (const bucket of buckets) {
      bucketMap.set(bucket.revenueCategory, {
        amount: Number(bucket._sum.amount ?? 0),
        count: bucket._count._all ?? 0,
        quantity: Number(bucket._sum.quantity ?? 0),
      });
    }

    return [
      PlatformRevenueCategory.RENTAL_STANDARD_LISTING,
      PlatformRevenueCategory.RENTAL_FEATURED_LISTING,
      PlatformRevenueCategory.BED_RENTAL,
      PlatformRevenueCategory.SALE_APARTMENT_LISTING,
    ].map((revenueCategory) => ({
      revenueCategory,
      ...(bucketMap.get(revenueCategory) ?? { amount: 0, count: 0, quantity: 0 }),
    }));
  }

  private static async getMonthlyAggregation(
    where: Prisma.PlatformRevenueEntryWhereInput,
  ): Promise<RevenueMonthlyBucket[]> {
    const monthRows = await prisma.$queryRaw<Array<{
      month: Date;
      amount: Prisma.Decimal | null;
      count: bigint | number;
      quantity: Prisma.Decimal | null;
    }>>`
      SELECT
        date_trunc('month', "occurred_at") AS month,
        COUNT(*)::bigint AS count,
        COALESCE(SUM("amount"), 0) AS amount,
        COALESCE(SUM("quantity"), 0) AS quantity
      FROM "platform_revenue_entries"
      WHERE ${this.buildMonthlyWhereSql(where)}
      GROUP BY 1
      ORDER BY 1 ASC
    `;

    return monthRows.map((row) => ({
      month: row.month.toISOString().slice(0, 10),
      amount: Number(row.amount ?? 0),
      count: Number(row.count ?? 0),
      quantity: Number(row.quantity ?? 0),
    }));
  }

  private static buildMonthlyWhereSql(where: Prisma.PlatformRevenueEntryWhereInput) {
    const conditions: Prisma.Sql[] = [];

    if (where.compoundId) {
      conditions.push(Prisma.sql`"compound_id" = ${where.compoundId}`);
    }

    if (where.occurredAt && typeof where.occurredAt === 'object') {
      if ('gte' in where.occurredAt && where.occurredAt.gte) {
        conditions.push(Prisma.sql`"occurred_at" >= ${where.occurredAt.gte}`);
      }
      if ('lt' in where.occurredAt && where.occurredAt.lt) {
        conditions.push(Prisma.sql`"occurred_at" < ${where.occurredAt.lt}`);
      }
    }

    if (where.revenueCategory) {
      conditions.push(Prisma.sql`"revenue_category" = ${where.revenueCategory}`);
    }

    if (where.sourceType) {
      conditions.push(Prisma.sql`"source_type" = ${where.sourceType}`);
    }

    if (conditions.length === 0) {
      return Prisma.sql`TRUE`;
    }

    return conditions.reduce((acc, condition) => Prisma.sql`${acc} AND ${condition}`);
  }

  private static toEntryListItem(
    entry: Prisma.PlatformRevenueEntryGetPayload<{ select: typeof revenueEntrySelect }>,
  ): RevenueEntryListItem {
    const sourceReference =
      entry.listing?.title ??
      entry.realEstateListing?.title ??
      entry.reservation?.tenantName ??
      entry.sourceId;

    return {
      id: entry.id,
      sourceType: entry.sourceType,
      sourceId: entry.sourceId,
      revenueCategory: entry.revenueCategory,
      amount: Number(entry.amount),
      unitRate: Number(entry.unitRate),
      quantity: Number(entry.quantity),
      currency: entry.currency,
      description: entry.description,
      occurredAt: entry.occurredAt.toISOString(),
      createdAt: entry.createdAt.toISOString(),
      sourceReference,
      listing: entry.listing
        ? {
            id: entry.listing.id,
            title: entry.listing.title,
            slug: entry.listing.slug,
          }
        : null,
      realEstateListing: entry.realEstateListing
        ? {
            id: entry.realEstateListing.id,
            title: entry.realEstateListing.title,
            slug: entry.realEstateListing.slug,
          }
        : null,
      reservation: entry.reservation
        ? {
            id: entry.reservation.id,
            tenantName: entry.reservation.tenantName,
            status: entry.reservation.status,
          }
        : null,
      payment: entry.payment
        ? {
            id: entry.payment.id,
            purpose: entry.payment.purpose,
            status: entry.payment.status,
          }
        : null,
    };
  }

}

export { PlatformRevenueCategory, PlatformRevenueSourceType };
