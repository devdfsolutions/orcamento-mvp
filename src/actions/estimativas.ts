// /actions/estimativas.ts
'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';

/* ===== helpers ===== */
function parseNum(v: FormDataEntryValue | null): number | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}
function round2(n: number | null | undefined) {
  if (n == null) return null;
  return Math.round(n * 100) / 100;
}
async function meId() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const me = await prisma.usuario.findUnique({
    where: { supabaseUserId: user.id },
    select: { id: true },
  });
  if (!me) redirect('/login');
  return me.id;
}

type FonteMat = 'P1' | 'P2' | 'P3' | null;
type FonteMo  = 'M1' | 'M2' | 'M3' | null;

/** Busca os preços do vínculo fornecedor+produto conforme a fonte escolhida (scoped por usuário) */
async function pickPrecoFromVinculo(
  usuarioId: number,
  fornecedorId: number,
  produtoId: number,
  _fonteMat: FonteMat,
  _fonteMo: FonteMo,
) {
  const vinc = await prisma.fornecedorProduto.findFirst({
    where: { usuarioId, fornecedorId, produtoId },
    select: {
      precoMatP1: true, precoMatP2: true, precoMatP3: true,
      precoMoM1: true,  precoMoM2: true,  precoMoM3: true,
    },
  });

  if (!vinc) return { mat: null, mo: null };

  let mat: number | null = null;
  if (_fonteMat === 'P1') mat = Number(vinc.precoMatP1 ?? null);
  if (_fonteMat === 'P2') mat = Number(vinc.precoMatP2 ?? null);
  if (_fonteMat === 'P3') mat = Number(vinc.precoMatP3 ?? null);

  let mo: number | null = null;
  if (_fonteMo === 'M1') mo = Number(vinc.precoMoM1 ?? null);
  if (_fonteMo === 'M2') mo = Number(vinc.precoMoM2 ?? null);
  if (_fonteMo === 'M3') mo = Number(vinc.precoMoM3 ?? null);

  return { mat, mo };
}

/* =========================
 * PROJETOS
 * ========================= */

export async function criarProjeto(formData: FormData) {
  const usuarioId = await meId();

  const nome = String(formData.get('nome') ?? '').trim();
  if (!nome) throw new Error('Informe o nome do projeto');

  const clienteIdRaw = String(formData.get('clienteId') ?? '').trim();
  const clienteId = clienteIdRaw ? Number(clienteIdRaw) : null;

  await prisma.projeto.create({
    data: {
      usuarioId,
      nome,
      status: 'rascunho',
      clienteId: clienteId ?? undefined,
    },
  });

  revalidatePath('/projetos');
}

/** Cria o projeto e devolve o ID (para redirecionar no "wizard") */
export async function criarProjetoAndGo(formData: FormData) {
  const usuarioId = await meId();

  const nome = String(formData.get('nome') ?? '').trim();
  if (!nome) throw new Error('Informe o nome do projeto');

  const clienteIdRaw = String(formData.get('clienteId') ?? '').trim();
  const clienteId = clienteIdRaw ? Number(clienteIdRaw) : null;

  const novo = await prisma.projeto.create({
    data: {
      usuarioId,
      nome,
      status: 'rascunho',
      clienteId: clienteId ?? undefined,
    },
    select: { id: true, usuarioId: true },
  });

  // garante a primeira estimativa (com usuarioId herdado do projeto)
  await ensureEstimativa(novo.id);

  revalidatePath('/projetos');
  return { id: novo.id };
}

/** Garante uma estimativa (pega a primeira do usuário/projeto ou cria) e devolve o id */
export async function ensureEstimativa(projetoId: number): Promise<number> {
  const proj = await prisma.projeto.findUnique({
    where: { id: projetoId },
    select: { id: true, usuarioId: true },
  });
  if (!proj) throw new Error('Projeto não encontrado');

  const e = await prisma.estimativa.findFirst({
    where: { projetoId, usuarioId: proj.usuarioId },
  });
  if (e) return e.id;

  const novo = await prisma.estimativa.create({
    data: { usuarioId: proj.usuarioId, projetoId, nome: 'Estimativa' },
  });
  return novo.id;
}

export async function aprovarEstimativa(formData: FormData) {
  const usuarioId = await meId();
  const estimativaId = Number(formData.get('estimativaId'));
  if (!estimativaId) throw new Error('Estimativa inválida');

  const atual = await prisma.estimativa.findFirst({
    where: { id: estimativaId, usuarioId },
    select: { id: true, aprovada: true, projetoId: true },
  });
  if (!atual) throw new Error('Estimativa não encontrada');

  await prisma.estimativa.update({
    where: { id: atual.id },
    data: { aprovada: !atual.aprovada },
  });

  revalidatePath(`/projetos/${atual.projetoId}/itens`);
  revalidatePath(`/projetos/${atual.projetoId}/estimativas`);
  revalidatePath(`/projetos`);
}

/* =========================
 * ITENS DA ESTIMATIVA
 * ========================= */

export async function adicionarItem(formData: FormData) {
  const usuarioId = await meId();

  const estimativaId = Number(formData.get('estimativaId'));
  const produtoId    = Number(formData.get('produtoId'));
  const fornecedorId = Number(formData.get('fornecedorId'));
  const unidadeId    = Number(formData.get('unidadeId'));
  const fontePrecoMat = (String(formData.get('fontePrecoMat') || '') || null) as FonteMat;
  const fontePrecoMo  = (String(formData.get('fontePrecoMo')  || '') || null) as FonteMo;
  const quantidade    = parseNum(formData.get('quantidade'));

  if (!estimativaId || !produtoId || !fornecedorId || !unidadeId) throw new Error('Dados do item inválidos');
  if (quantidade == null || quantidade <= 0) throw new Error('Quantidade inválida');

  const { mat, mo } = await pickPrecoFromVinculo(usuarioId, fornecedorId, produtoId, fontePrecoMat, fontePrecoMo);

  const valorUnitMat = round2(mat);
  const valorUnitMo  = round2(mo);
  const totalItem    = round2((quantidade ?? 0) * ((valorUnitMat ?? 0) + (valorUnitMo ?? 0)));

  await prisma.estimativaItem.create({
    data: {
      usuarioId,
      estimativaId, produtoId, fornecedorId, unidadeId,
      quantidade: round2(quantidade!)!,
      fontePrecoMat: fontePrecoMat as any,
      fontePrecoMo:  fontePrecoMo  as any,
      valorUnitMat, valorUnitMo, totalItem,
    },
  });

  const projeto = await prisma.estimativa.findFirst({
    where: { id: estimativaId, usuarioId },
    select: { projetoId: true },
  });

  revalidatePath(`/projetos/${projeto?.projetoId}/itens`);
}

export async function excluirItem(formData: FormData) {
  const usuarioId = await meId();

  const id = Number(formData.get('id'));
  const estimativaId = Number(formData.get('estimativaId'));
  if (!id || !estimativaId) throw new Error('Item inválido');

  const est = await prisma.estimativa.findFirst({
    where: { id: estimativaId, usuarioId },
    select: { projetoId: true },
  });

  await prisma.estimativaItem.deleteMany({ where: { id, usuarioId } });

  revalidatePath(`/projetos/${est?.projetoId}/itens`);
}

/** Atualizar item existente (recalcula valores) */
export async function atualizarItem(formData: FormData) {
  const usuarioId = await meId();

  const id           = Number(formData.get('id'));
  const estimativaId = Number(formData.get('estimativaId'));
  const produtoId    = Number(formData.get('produtoId'));
  const fornecedorId = Number(formData.get('fornecedorId'));
  const unidadeId    = Number(formData.get('unidadeId'));
  const quantidade   = parseNum(formData.get('quantidade'));
  const fontePrecoMat = (String(formData.get('fontePrecoMat') || '') || null) as FonteMat;
  const fontePrecoMo  = (String(formData.get('fontePrecoMo')  || '') || null) as FonteMo;

  if (!id || !estimativaId || !produtoId || !fornecedorId || !unidadeId) throw new Error('Dados do item inválidos');
  if (quantidade == null || quantidade <= 0) throw new Error('Quantidade inválida');

  const { mat, mo } = await pickPrecoFromVinculo(usuarioId, fornecedorId, produtoId, fontePrecoMat, fontePrecoMo);

  const valorUnitMat = round2(mat);
  const valorUnitMo  = round2(mo);
  const totalItem    = round2((quantidade ?? 0) * ((valorUnitMat ?? 0) + (valorUnitMo ?? 0)));

  await prisma.estimativaItem.updateMany({
    where: { id, usuarioId },
    data: {
      fornecedorId, unidadeId,
      quantidade: round2(quantidade!)!,
      fontePrecoMat: fontePrecoMat as any,
      fontePrecoMo:  fontePrecoMo  as any,
      valorUnitMat, valorUnitMo, totalItem,
    },
  });

  const est = await prisma.estimativa.findFirst({
    where: { id: estimativaId, usuarioId },
    select: { projetoId: true },
  });

  revalidatePath(`/projetos/${est?.projetoId}/itens`);
}

/** Atualiza nome e/ou cliente do projeto (scoped por usuário) */
export async function atualizarProjeto(formData: FormData) {
  const usuarioId = await meId();

  const projetoId = Number(formData.get('projetoId'));
  if (!projetoId) throw new Error('Projeto inválido');

  const nome = String(formData.get('nome') ?? '').trim();

  const clienteIdRaw = String(formData.get('clienteId') ?? '').trim();
  const clienteId = clienteIdRaw ? Number(clienteIdRaw) : null;

  await prisma.projeto.updateMany({
    where: { id: projetoId, usuarioId },
    data: {
      ...(nome ? { nome } : {}),
      clienteId,
    },
  });

  revalidatePath(`/projetos/${projetoId}/itens`);
  revalidatePath('/projetos');
}
