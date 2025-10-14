import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const rows = await prisma.clienteUsuario.findMany({
    orderBy: { nome: 'asc' },
    select: { id: true, nome: true },
  });
  return NextResponse.json(rows);
}
