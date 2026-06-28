import type { PlatformRevenueCategory, PlatformRevenueSourceType, Prisma } from '@prisma/client';
import type { PaginationMeta } from '../../common/utils/pagination.js';

export const revenueRangeValues = ['TODAY', 'MONTH', 'YEAR', 'ALL', 'CUSTOM'] as const;
export type RevenueRange = (typeof revenueRangeValues)[number];

export interface RevenueDateRange {
  range: RevenueRange;
  from?: string;
  to?: string;
}

export interface RevenueWindow {
  startAt: Date | null;
  endAt: Date | null;
}

export interface RecordRevenueEntryInput {
  compoundId: string;
  sourceType: PlatformRevenueSourceType;
  sourceId: string;
  revenueCategory: PlatformRevenueCategory;
  amount: Prisma.Decimal;
  unitRate: Prisma.Decimal;
  quantity: Prisma.Decimal;
  currency: string;
  description: string;
  occurredAt?: Date;
  listingId?: string | null;
  realEstateListingId?: string | null;
  reservationId?: string | null;
  paymentId?: string | null;
  metadata?: Prisma.InputJsonValue | null;
}

export interface RevenueEntryListItem {
  id: string;
  sourceType: PlatformRevenueSourceType;
  sourceId: string;
  revenueCategory: PlatformRevenueCategory;
  amount: number;
  unitRate: number;
  quantity: number;
  currency: string;
  description: string;
  occurredAt: string;
  createdAt: string;
  sourceReference: string;
  listing: {
    id: string;
    title: string;
    slug: string;
  } | null;
  realEstateListing: {
    id: string;
    title: string;
    slug: string;
  } | null;
  reservation: {
    id: string;
    tenantName: string;
    status: string;
  } | null;
  payment: {
    id: string;
    purpose: string;
    status: string;
  } | null;
}

export interface RevenueEntriesResult {
  entries: RevenueEntryListItem[];
  meta: PaginationMeta;
}

export interface RevenueSummaryBucket {
  amount: number;
  count: number;
  quantity: number;
}

export interface RevenueMonthlyBucket {
  month: string;
  amount: number;
  count: number;
  quantity: number;
}

export interface RevenueSummaryResult {
  filters: RevenueDateRange & RevenueWindow;
  totals: RevenueSummaryBucket;
  byCategory: Array<RevenueSummaryBucket & { revenueCategory: PlatformRevenueCategory }>;
  monthlyAggregation: RevenueMonthlyBucket[];
  recentEntries: RevenueEntryListItem[];
}

export type RevenueEntrySelect = Prisma.PlatformRevenueEntrySelect;
