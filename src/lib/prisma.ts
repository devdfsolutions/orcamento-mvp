// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

declare global {
  // reusar a instância em dev/hot-reload
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Client sem middleware de timestamps
export const prisma =
  globalThis.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;
