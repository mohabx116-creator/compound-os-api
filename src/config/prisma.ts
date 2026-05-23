import { PrismaClient, Prisma } from '@prisma/client';
import { env } from './env.js';

const logLevels: Prisma.LogDefinition[] = env.NODE_ENV === 'development'
  ? [
      { emit: 'stdout', level: 'query' },
      { emit: 'stdout', level: 'info' },
      { emit: 'stdout', level: 'warn' },
      { emit: 'stdout', level: 'error' },
    ]
  : [
      { emit: 'stdout', level: 'warn' },
      { emit: 'stdout', level: 'error' },
    ];

declare global {
  var prismaGlobal: PrismaClient | undefined;
}

export const prisma = globalThis.prismaGlobal ?? new PrismaClient({
  log: logLevels,
});

if (env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}
