// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "production" ? ["error"] : ["query", "error", "warn"],
  });

// Evita recriar cliente a cada hot-reload em dev:
// Na Vercel (production) não entra neste if.
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
