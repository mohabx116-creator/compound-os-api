export const revenueRangeValues = ['MONTH', 'YEAR', 'ALL', 'CUSTOM'] as const;
export type RevenueRange = (typeof revenueRangeValues)[number];

export const revenueCategoryValues = [
  'RENTAL_STANDARD_LISTING',
  'RENTAL_FEATURED_LISTING',
  'BED_RENTAL',
  'SALE_APARTMENT_LISTING',
] as const;
export type RevenueCategory = (typeof revenueCategoryValues)[number];

export const revenueSourceTypeValues = [
  'RENTAL_LISTING',
  'RENTAL_RESERVATION',
  'REAL_ESTATE_LISTING',
] as const;
export type RevenueSourceType = (typeof revenueSourceTypeValues)[number];

export const revenueEntryKindValues = ['CHARGE', 'REVERSAL'] as const;
export type RevenueEntryKind = (typeof revenueEntryKindValues)[number];

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
  sourceType: RevenueSourceType;
  sourceId: string;
  entryKind?: RevenueEntryKind;
  reversalOfEntryId?: string | null;
  revenueCategory: RevenueCategory;
  amountEgp: number;
  unitRateEgp: number;
  quantity: number;
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
  sourceType: RevenueSourceType;
  sourceId: string;
  revenueCategory: RevenueCategory;
  amountEgp: number;
  unitRateEgp: number;
  quantity: number;
  occurredAt: string;
  createdAt: string;
  sourceReference: string;
  listing?: {
    id: string;
    title: string;
    slug: string;
  } | null;
  realEstateListing?: {
    id: string;
    title: string;
    slug: string;
  } | null;
  reservation?: {
    id: string;
    tenantName: string;
    status: string;
  } | null;
  payment?: {
    id: string;
    purpose: string;
    status: string;
  } | null;
}

export interface RevenueEntriesResult {
  entries: RevenueEntryListItem[];
  meta: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface RevenueSummaryBucket {
  amountEgp: number;
  count: number;
  quantity: number;
}

export interface RevenueMonthlyBucket extends RevenueSummaryBucket {
  month: string;
}

export interface RevenueSummaryResult {
  activationAt: string | null;
  filters: RevenueDateRange & {
    startAt: string | null;
    endAt: string | null;
  };
  totals: RevenueSummaryBucket;
  byCategory: Array<RevenueSummaryBucket & { revenueCategory: RevenueCategory }>;
  monthlyAggregation: RevenueMonthlyBucket[];
  recentEntries: RevenueEntryListItem[];
}
import type { Prisma } from '@prisma/client';
