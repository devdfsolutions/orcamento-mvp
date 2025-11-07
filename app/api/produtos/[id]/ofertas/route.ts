// app/api/produtos/[id]/ofertas/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSupabaseServer } from '@/lib/supabaseServer';

type FonteMat = 'P1'|'P2'|'P3';
type FonteMo  = 'M1'|'M2'|'M3';

function asNum(v: any): number | null {
  const n = v == null ? null : Number(v);
  return Number.isFinite(n) ? n : null;
}

function computeTiers(vals: number[]): {min: number; mid: number; max: number} | null {
  const arr = vals.filter(v => Number.isFinite(v)).slice().sort((a,b)=>a-b);
  if (arr.length === 0) return null;
  if (arr.length === 1) return { min: arr[0], mid: arr[0], max: arr[0] };
  if (arr.length === 2) return { min: arr[0], mid: arr[0], max: arr[1] };
  // 3+ → min / mediana / max
  const mid = arr[Math.floor(arr.length/2)];
  return { min: arr[0], mid, max: arr[arr.length-1] };
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await getSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const me = await prisma.usuario.findUnique({
      where: { supabaseUserId: user.id },
      select: { id: true },
    });
    if (!me) return NextResponse.json({ error: 'Usuário inválido' }, { status: 401 });

    const produtoId = Number(params.id);
    if (!Number.isFinite(produtoId)) {
      return NextResponse.json({ error: 'Produto inválido' }, { status: 400 });
    }

    // produto PRECISA ser meu
    const produto = await prisma.produtoServico.findFirst({
      where: { id: produtoId, usuarioId: me.id },
      select: { id: true, unidade: { select: { id: true, sigla: true } } }
    });
    if (!produto) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    const vincs = await prisma.fornecedorProduto.findMany({
      where: { produtoId, usuarioId: me.id },
      include: { fornecedor: { select: { id: true, nome: true } } },
      orderBy: [{ fornecedor: { nome: 'asc' } }],
    });

    const fornecedores = vincs.map(v => ({
      id: v.fornecedorId,
      nome: v.fornecedor.nome,
      mat: {
        P1: asNum(v.precoMatP1),
        P2: asNum(v.precoMatP2),
        P3: asNum(v.precoMatP3),
      } as Partial<Record<FonteMat, number|null>>,
      mo: {
        M1: asNum(v.precoMoM1),
        M2: asNum(v.precoMoM2),
        M3: asNum(v.precoMoM3),
      } as Partial<Record<FonteMo, number|null>>,
    }));

    // tiers de materiais
    const matPairs: Array<{valor:number; fornecedorId:number; fonte: FonteMat}> = [];
    for (const f of fornecedores) {
      (['P1','P2','P3'] as FonteMat[]).forEach(k => {
        const v = f.mat[k];
        if (v != null) matPairs.push({ valor: v!, fornecedorId: f.id, fonte: k });
      });
    }
    const matOnly = computeTiers(matPairs.map(x=>x.valor));
    const tiersMat = {
      min: matOnly ? matPairs.find(x=>x.valor===matOnly.min) ?? null : null,
      mid: matOnly ? matPairs.find(x=>x.valor===matOnly.mid) ?? null : null,
      max: matOnly ? matPairs.find(x=>x.valor===matOnly.max) ?? null : null,
    };

    // tiers de mão de obra
    const moPairs: Array<{valor:number; fornecedorId:number; fonte: FonteMo}> = [];
    for (const f of fornecedores) {
      (['M1','M2','M3'] as FonteMo[]).forEach(k => {
        const v = f.mo[k];
        if (v != null) moPairs.push({ valor: v!, fornecedorId: f.id, fonte: k });
      });
    }
    const moOnly = computeTiers(moPairs.map(x=>x.valor));
    const tiersMo = {
      min: moOnly ? moPairs.find(x=>x.valor===moOnly.min) ?? null : null,
      mid: moOnly ? moPairs.find(x=>x.valor===moOnly.mid) ?? null : null,
      max: moOnly ? moPairs.find(x=>x.valor===moOnly.max) ?? null : null,
    };

    return NextResponse.json({
      produtoId,
      unidade: produto?.unidade ?? null,
      fornecedores,
      tiers: { mat: tiersMat, mo: tiersMo },
    });
  } catch (err) {
    console.error('[api/produtos/:id/ofertas]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
