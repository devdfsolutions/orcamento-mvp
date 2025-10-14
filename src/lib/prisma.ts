// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

declare global {
  // Evita recriar cliente em HMR no Next.js (apenas dev)
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}

const prismaClient = global.__prisma__ ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.__prisma__ = prismaClient;
}

// Export nomeado (para `import { prisma } ...`)
export const prisma = prismaClient;

// Export default (para `import prisma ...`)
export default prismaClient;
