import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { RentalService } from '../src/modules/rentals/rental.service.js';

const PAGE_SIZE = 100;

type BackupPayload = {
  generatedAt: string;
  source: string;
  pageSize: number;
  totalListings: number;
  listings: unknown[];
};

function formatDateStamp(value: Date) {
  return value.toISOString().slice(0, 10);
}

async function collectPublicListingSlugs() {
  const slugs = new Set<string>();
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    const result = await RentalService.listPublicListings({ page, limit: PAGE_SIZE });
    for (const listing of result.listings) {
      if (listing?.slug) {
        slugs.add(String(listing.slug));
      }
    }
    hasNextPage = result.meta.hasNextPage;
    page += 1;
  }

  return [...slugs];
}

async function collectPublicListingDetails() {
  const slugs = await collectPublicListingSlugs();
  const listings: unknown[] = [];

  for (const slug of slugs) {
    const detail = await RentalService.getPublicListingBySlug(slug);
    listings.push(detail);
  }

  return listings;
}

async function main() {
  const listings = await collectPublicListingDetails();
  const now = new Date();
  const payload: BackupPayload = {
    generatedAt: now.toISOString(),
    source: 'compound-os-api/prisma',
    pageSize: PAGE_SIZE,
    totalListings: listings.length,
    listings,
  };

  const outputDir = resolve(process.cwd(), 'backups', 'rentals');
  await mkdir(outputDir, { recursive: true });

  const datedFile = join(outputDir, `rentals-backup-${formatDateStamp(now)}.json`);
  const latestFile = join(outputDir, 'rentals-backup-latest.json');
  const serialized = `${JSON.stringify(payload, null, 2)}\n`;

  await Promise.all([
    writeFile(datedFile, serialized, 'utf8'),
    writeFile(latestFile, serialized, 'utf8'),
  ]);

  console.log(`Exported ${payload.totalListings} rental listings`);
  console.log(`Latest backup: ${latestFile}`);
  console.log(`Dated backup:  ${datedFile}`);
}

main().catch((error) => {
  console.error('Failed to export rentals backup');
  console.error(error);
  process.exitCode = 1;
});

