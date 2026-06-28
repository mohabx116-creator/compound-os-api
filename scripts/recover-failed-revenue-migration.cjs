#!/usr/bin/env node

const { spawnSync } = require('node:child_process');

const MIGRATION_NAME = '20260628160000_add_platform_revenue_ledger';

if (process.argv.length > 2) {
  console.error('This recovery script does not accept arguments.');
  process.exit(1);
}

const result = spawnSync('npx', ['prisma', 'migrate', 'resolve', '--rolled-back', MIGRATION_NAME], {
  encoding: 'utf8',
  shell: true,
});

if (result.stdout) {
  process.stdout.write(result.stdout);
}

if (result.stderr) {
  process.stderr.write(result.stderr);
}

if (result.status === 0) {
  process.exit(0);
}

const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;

if (output.includes('P3011') || output.includes('P3012')) {
  process.exit(0);
}

console.error(`Failed to recover Prisma migration ${MIGRATION_NAME}.`);
process.exit(result.status ?? 1);
