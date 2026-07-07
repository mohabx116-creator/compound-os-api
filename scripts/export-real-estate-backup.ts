import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { RealEstateService } from '../src/modules/real-estate/real-estate.service.js';
import { mapPublicListingsDto } from '../src/modules/real-estate/real-estate.mapper.js';

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

async function collectPublicListingDetails() {
  const listings = await new RealEstateService().getPublicListings({});
  return mapPublicListingsDto(listings);
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

  const outputDir = resolve(process.cwd(), 'backups', 'real-estate');
  await mkdir(outputDir, { recursive: true });

  const datedFile = join(outputDir, `real-estate-backup-${formatDateStamp(now)}.json`);
  const latestFile = join(outputDir, 'real-estate-backup-latest.json');
  const serialized = `${JSON.stringify(payload, null, 2)}\n`;

  await Promise.all([
    writeFile(datedFile, serialized, 'utf8'),
    writeFile(latestFile, serialized, 'utf8'),
  ]);

  console.log(`Exported ${payload.totalListings} real estate listings`);
  console.log(`Latest backup: ${latestFile}`);
  console.log(`Dated backup:  ${datedFile}`);
}

main().catch((error) => {
  console.error('Failed to export real estate backup');
  console.error(error);
  process.exitCode = 1;
});
