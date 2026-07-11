import { prisma } from '../../config/prisma.js';

interface PlatformStats {
  servicesCount: number;
  realEstateListingsCount: number;
  rentalListingsCount: number;
  communityEntriesCount: number;
  categoriesCount: number;
  updatedAt: string;
  isFallback: boolean;
  unavailableCounts?: string[];
}

let cachedStats: PlatformStats | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export class PublicStatsService {
  static async getPlatformStats(): Promise<PlatformStats> {
    const now = Date.now();
    
    if (cachedStats && (now - lastFetchTime) < CACHE_TTL_MS) {
      return cachedStats;
    }

    try {
      const [servicesCount, realEstateListingsCount, rentalListingsCount, categoriesCount] = await Promise.all([
        prisma.serviceItem.count({
          where: {
            status: 'ACTIVE',
            isPublic: true,
          },
        }),
        prisma.realEstateListing.count({
          where: {
            status: 'PUBLISHED',
          },
        }),
        prisma.rentalListing.count({
          where: {
            status: 'ACTIVE',
            isPublished: true,
          },
        }),
        prisma.serviceCategory.count({
          where: {
            isActive: true,
          },
        }),
      ]);

      cachedStats = {
        servicesCount,
        realEstateListingsCount,
        rentalListingsCount,
        communityEntriesCount: 0, // No explicit model for community entries yet
        categoriesCount,
        updatedAt: new Date().toISOString(),
        isFallback: false,
        unavailableCounts: ['communityEntriesCount'], // Always unavailable for now
      };
      lastFetchTime = now;

      return cachedStats;
    } catch (error) {
      console.error('Failed to fetch platform stats:', error);
      // Return safe defaults if DB fails, rather than crashing
      return {
        servicesCount: 0,
        realEstateListingsCount: 0,
        rentalListingsCount: 0,
        communityEntriesCount: 0,
        categoriesCount: 0,
        updatedAt: new Date().toISOString(),
        isFallback: true,
        unavailableCounts: [
          'servicesCount',
          'realEstateListingsCount',
          'rentalListingsCount',
          'categoriesCount',
          'communityEntriesCount',
        ],
      };
    }
  }
}
