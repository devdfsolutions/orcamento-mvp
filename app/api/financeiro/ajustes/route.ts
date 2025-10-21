// app/api/financeiro/ajustes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { upsertAjustesFinanceiros } from '@/actions/financeiro';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    // validação mínima
    if (
      !data ||
      typeof data.projetoId !== 'number' ||
      typeof data.usuarioId !== 'number' ||
      !Array.isArray(data.itens)
    ) {
      return NextResponse.json({ ok: false, error: 'Payload inválido' }, { status: 400 });
    }

    await upsertAjustesFinanceiros({
      projetoId: data.projetoId,
      usuarioId: data.usuarioId,
      itens: data.itens,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[api/financeiro/ajustes] erro', err);
    return NextResponse.json(
      { ok: false, error: 'Erro interno' },
      { status: 500 }
    );
  }
}
