import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const projetoIdRaw = url.searchParams.get('projetoId');
    const projetoId = Number(projetoIdRaw);

    if (!Number.isFinite(projetoId)) {
      return NextResponse.json(
        { ok: false, error: 'Informe ?projetoId=NUM' },
        { status: 400 }
      );
    }

    // Busca estimativas desse projeto e conta itens
    const estimativas = await prisma.estimativa.findMany({
      where: { projetoId },
      orderBy: [{ aprovada: 'desc' }, { criadaEm: 'desc' }],
      select: {
        id: true,
        aprovada: true,
        criadaEm: true,
        _count: { select: { itens: true } },
      },
    });

    return NextResponse.json({
      ok: true,
      projetoId,
      totalEstimativas: estimativas.length,
      estimativas: estimativas.map(e => ({
        id: e.id,
        aprovada: e.aprovada,
        criadaEm: e.criadaEm,
        itensCount: e._count.itens,
      })),
    });
  } catch (err) {
    console.error('[debug/financeiro] ', err);
    return NextResponse.json({ ok: false, error: 'Erro interno' }, { status: 500 });
  }
}
