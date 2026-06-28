const { spawnSync } = require('child_process');

const migrationName = '20260628203000_expand_platform_revenue_reversals';
const result = spawnSync(
  'npx',
  ['prisma', 'migrate', 'resolve', '--rolled-back', migrationName],
  {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  },
);

const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
const safeNoOp = /P3011|P3012/.test(output);

if (result.status === 0 || safeNoOp) {
  process.exit(0);
}

const code = result.status ?? 1;
console.error(`recovery hook failed with exit code ${code}`);
process.exit(code);
