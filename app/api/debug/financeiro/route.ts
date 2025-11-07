// app/api/debug/financeiro/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSupabaseServer } from '@/lib/supabaseServer';

export async function GET(req: NextRequest) {
  try {
    const supabase = await getSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 });

    const me = await prisma.usuario.findUnique({
      where: { supabaseUserId: user.id },
      select: { id: true },
    });
    if (!me) return NextResponse.json({ ok: false, error: 'Usuário inválido' }, { status: 401 });

    const url = new URL(req.url);
    const projetoIdRaw = url.searchParams.get('projetoId');
    const projetoId = Number(projetoIdRaw);

    if (!Number.isFinite(projetoId)) {
      return NextResponse.json(
        { ok: false, error: 'Informe ?projetoId=NUM' },
        { status: 400 }
      );
    }

    // Confirma que o projeto é do usuário
    const projeto = await prisma.projeto.findFirst({
      where: { id: projetoId, usuarioId: me.id },
      select: { id: true },
    });
    if (!projeto) {
      return NextResponse.json({ ok: false, error: 'Projeto não encontrado' }, { status: 404 });
    }

    // Busca estimativas desse projeto e conta itens
    const estimativas = await prisma.estimativa.findMany({
      where: { projetoId, usuarioId: me.id },
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
