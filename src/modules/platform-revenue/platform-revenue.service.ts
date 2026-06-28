import { Prisma } from '@prisma/client';
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
  RevenueCategory,
  RevenueSourceType,
} from './platform-revenue.types.js';

const revenueEntrySelect = {
  id: true,
  sourceType: true,
  sourceId: true,
  revenueCategory: true,
  amountEgp: true,
  unitRateEgp: true,
  quantity: true,
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
  amountEgp: true,
  unitRateEgp: true,
  quantity: true,
  description: true,
  occurredAt: true,
  createdAt: true,
} satisfies Prisma.PlatformRevenueEntrySelect;

const revenueCategories: RevenueCategory[] = [
  'RENTAL_STANDARD_LISTING',
  'RENTAL_FEATURED_LISTING',
  'BED_RENTAL',
  'SALE_APARTMENT_LISTING',
];

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
        amountEgp: input.amountEgp,
        unitRateEgp: input.unitRateEgp,
        quantity: input.quantity,
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

    const [activationAt, totalsAggregate, categoryBuckets, monthlyAggregation, recentEntries] = await Promise.all([
      this.getActivationAt(compoundId),
      prisma.platformRevenueEntry.aggregate({
        where,
        _count: { _all: true },
        _sum: { amountEgp: true, quantity: true },
      }),
      prisma.platformRevenueEntry.groupBy({
        by: ['revenueCategory'],
        where,
        _count: { _all: true },
        _sum: { amountEgp: true, quantity: true },
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
      activationAt: activationAt?.toISOString() ?? null,
      filters: {
        ...query,
        startAt: window.startAt?.toISOString() ?? null,
        endAt: window.endAt?.toISOString() ?? null,
      },
      totals: {
        amountEgp: Number(totalsAggregate._sum.amountEgp ?? 0),
        count: totalsAggregate._count._all ?? 0,
        quantity: Number(totalsAggregate._sum.quantity ?? 0),
      },
      byCategory: this.normalizeCategoryBuckets(categoryBuckets),
      monthlyAggregation,
      recentEntries: recentEntries.map((entry) => this.toEntryListItem(entry)),
    };
  }

  static async getMonthlySummary(
    compoundId: string,
    query: RevenueDateRange,
  ): Promise<Pick<RevenueSummaryResult, 'activationAt' | 'filters' | 'monthlyAggregation'>> {
    const window = this.resolveWindow(query);
    const where = this.buildWhere(compoundId, query, window);
    const [activationAt, monthlyAggregation] = await Promise.all([
      this.getActivationAt(compoundId),
      this.getMonthlyAggregation(where),
    ]);

    return {
      activationAt: activationAt?.toISOString() ?? null,
      filters: {
        ...query,
        startAt: window.startAt?.toISOString() ?? null,
        endAt: window.endAt?.toISOString() ?? null,
      },
      monthlyAggregation,
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
    query: RevenueDateRange & { revenueCategory?: RevenueCategory; sourceType?: RevenueSourceType },
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
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    switch (query.range) {
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
      revenueCategory: string;
      _count: { _all: number };
      _sum: { amountEgp: number | null; quantity: number | null };
    }>,
  ): Array<RevenueSummaryBucket & { revenueCategory: RevenueCategory }> {
    const bucketMap = new Map<string, RevenueSummaryBucket>();

    for (const bucket of buckets) {
      bucketMap.set(bucket.revenueCategory, {
        amountEgp: Number(bucket._sum.amountEgp ?? 0),
        count: bucket._count._all ?? 0,
        quantity: Number(bucket._sum.quantity ?? 0),
      });
    }

    return revenueCategories.map((revenueCategory) => ({
      revenueCategory,
      ...(bucketMap.get(revenueCategory) ?? { amountEgp: 0, count: 0, quantity: 0 }),
    }));
  }

  private static async getMonthlyAggregation(
    where: Prisma.PlatformRevenueEntryWhereInput,
  ): Promise<RevenueMonthlyBucket[]> {
    const monthRows = await prisma.$queryRaw<Array<{
      month: Date;
      amount_egp: bigint | number | null;
      count: bigint | number;
      quantity: bigint | number | null;
    }>>`
      SELECT
        date_trunc('month', "occurred_at") AS month,
        COUNT(*)::bigint AS count,
        COALESCE(SUM("amount_egp"), 0)::bigint AS amount_egp,
        COALESCE(SUM("quantity"), 0)::bigint AS quantity
      FROM "platform_revenue_entries"
      WHERE ${this.buildMonthlyWhereSql(where)}
      GROUP BY 1
      ORDER BY 1 ASC
    `;

    return monthRows.map((row) => ({
      month: row.month.toISOString().slice(0, 10),
      amountEgp: Number(row.amount_egp ?? 0),
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

  private static async getActivationAt(compoundId: string): Promise<Date | null> {
    const activation = await prisma.platformRevenueEntry.findFirst({
      where: { compoundId },
      orderBy: { occurredAt: 'asc' },
      select: { occurredAt: true },
    });

    return activation?.occurredAt ?? null;
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
      sourceType: entry.sourceType as RevenueSourceType,
      sourceId: entry.sourceId,
      revenueCategory: entry.revenueCategory as RevenueCategory,
      amountEgp: Number(entry.amountEgp),
      unitRateEgp: Number(entry.unitRateEgp),
      quantity: Number(entry.quantity),
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
