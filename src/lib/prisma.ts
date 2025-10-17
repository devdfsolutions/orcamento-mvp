// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

declare global {
  // Permite reusar a instância em dev/hot-reload sem recriar
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'warn', 'error'],
  });

// ✅ Middleware SEGURO: só injeta createdAt/updatedAt se os campos existirem no modelo
prisma.$use(async (params, next) => {
  const data = params.args?.data;
  if (!data) return next(params);

  // checa de forma segura se o objeto tem as chaves
  const hasCreatedAt = Object.prototype.hasOwnProperty.call(data, 'createdAt');
  const hasUpdatedAt = Object.prototype.hasOwnProperty.call(data, 'updatedAt');

  if (params.action === 'create') {
    if (hasCreatedAt && (data.createdAt == null)) data.createdAt = new Date();
    if (hasUpdatedAt && (data.updatedAt == null)) data.updatedAt = new Date();
  } else if (params.action === 'update' || params.action === 'updateMany') {
    if (hasUpdatedAt) data.updatedAt = new Date();
  }

  return next(params);
});

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;
