'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSupabaseServer } from '@/lib/supabaseServer';

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

type FonteMat = 'P1' | 'P2' | 'P3' | null;
type FonteMo  = 'M1' | 'M2' | 'M3' | null;

/** resolve o Usuario interno (id inteiro) a partir do Supabase */
async function getMeUsuarioId(): Promise<number> {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado.');

  const me = await prisma.usuario.findUnique({
    where: { supabaseUserId: user.id },
    select: { id: true },
  });
  if (!me) throw new Error('Usuário da aplicação não encontrado.');
  return me.id; // inteiro (FK)
}

/** busca preço do vínculo fornecedor-produto (agora com usuarioId) */
async function pickPrecoFromVinculo(
  usuarioId: number,
  fornecedorId: number,
  produtoId: number,
  fonteMat: FonteMat,
  fonteMo: FonteMo,
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
  if (fonteMat === 'P1') mat = Number(vinc.precoMatP1 ?? null);
  if (fonteMat === 'P2') mat = Number(vinc.precoMatP2 ?? null);
  if (fonteMat === 'P3') mat = Number(vinc.precoMatP3 ?? null);

  let mo: number | null = null;
  if (fonteMo === 'M1') mo = Number(vinc.precoMoM1 ?? null);
  if (fonteMo === 'M2') mo = Number(vinc.precoMoM2 ?? null);
  if (fonteMo === 'M3') mo = Number(vinc.precoMoM3 ?? null);

  return { mat, mo };
}

/* ==== redireciona para /projetos/[pid]/itens com mensagem, sem quebrar a página ==== */
async function backToItensWithError(estimativaId: number, err: unknown) {
  const est = await prisma.estimativa.findUnique({
    where: { id: estimativaId },
    select: { projetoId: true },
  });
  const pid = est?.projetoId;
  const msg =
    (err as any)?.message ??
    (typeof err === 'string' ? err : 'Falha ao salvar o item.');

  if (pid) {
    revalidatePath(`/projetos/${pid}/itens`);
    redirect(`/projetos/${pid}/itens?e=${encodeURIComponent(msg)}`);
  }
  redirect(`/projetos?e=${encodeURIComponent(msg)}`);
}

/* =========================
 * PROJETOS (mantidos por segurança)
 * ========================= */

export async function criarProjeto(formData: FormData) {
  const usuarioId = await getMeUsuarioId();
  const nome = String(formData.get('nome') ?? '').trim();
  if (!nome) throw new Error('Informe o nome do projeto');

  const clienteIdRaw = String(formData.get('clienteId') ?? '').trim();
  const clienteId = clienteIdRaw ? Number(clienteIdRaw) : null;

  // valida cliente do mesmo usuário (se houver)
  if (clienteId) {
    const cli = await prisma.clienteUsuario.findFirst({
      where: { id: clienteId, usuarioId },
      select: { id: true },
    });
    if (!cli) throw new Error('Cliente inválido para este usuário.');
  }

  await prisma.projeto.create({
    data: { usuarioId, nome, clienteId: clienteId ?? undefined, status: 'rascunho' },
  });

  revalidatePath('/projetos');
}

export async function criarProjetoAndGo(formData: FormData) {
  const usuarioId = await getMeUsuarioId();
  const nome = String(formData.get('nome') ?? '').trim();
  if (!nome) throw new Error('Informe o nome do projeto');

  const clienteIdRaw = String(formData.get('clienteId') ?? '').trim();
  const clienteId = clienteIdRaw ? Number(clienteIdRaw) : null;

  if (clienteId) {
    const cli = await prisma.clienteUsuario.findFirst({
      where: { id: clienteId, usuarioId },
      select: { id: true },
    });
    if (!cli) throw new Error('Cliente inválido para este usuário.');
  }

  const novo = await prisma.projeto.create({
    data: { usuarioId, nome, clienteId: clienteId ?? undefined, status: 'rascunho' },
    select: { id: true },
  });

  await ensureEstimativa(novo.id);

  revalidatePath('/projetos');
  return { id: novo.id };
}

/** Garante estimativa do projeto pertencente ao usuário */
export async function ensureEstimativa(projetoId: number): Promise<number> {
  const usuarioId = await getMeUsuarioId();

  // projeto precisa ser meu
  const proj = await prisma.projeto.findFirst({
    where: { id: projetoId, usuarioId },
    select: { id: true },
  });
  if (!proj) throw new Error('Projeto não pertence ao usuário.');

  const e = await prisma.estimativa.findFirst({
    where: { projetoId: projetoId, usuarioId },
    select: { id: true },
  });
  if (e) return e.id;

  const novo = await prisma.estimativa.create({
    data: { usuarioId, projetoId, nome: 'Estimativa' },
    select: { id: true },
  });
  return novo.id;
}

export async function aprovarEstimativa(formData: FormData) {
  const usuarioId = await getMeUsuarioId();
  const estimativaId = Number(formData.get('estimativaId'));
  if (!estimativaId) throw new Error('Estimativa inválida');

  const atual = await prisma.estimativa.findFirst({
    where: { id: estimativaId, usuarioId },
  });
  if (!atual) throw new Error('Estimativa não encontrada para este usuário.');

  await prisma.estimativa.update({
    where: { id: estimativaId },
    data: { aprovada: !atual.aprovada },
  });

  revalidatePath(`/projetos/${atual.projetoId}/itens`);
  revalidatePath(`/projetos/${atual.projetoId}/estimativas`);
  revalidatePath(`/projetos`);
}

/* =========================
 * ITENS
 * ========================= */

export async function adicionarItem(formData: FormData) {
  const estimativaId = Number(formData.get('estimativaId'));
  try {
    const usuarioId = await getMeUsuarioId();
    if (!estimativaId) throw new Error('Estimativa inválida');

    // valida que a estimativa é do usuário
    const est = await prisma.estimativa.findFirst({
      where: { id: estimativaId, usuarioId },
      select: { id: true, projetoId: true },
    });
    if (!est) throw new Error('Estimativa não pertence ao usuário.');

    const produtoId    = Number(formData.get('produtoId'));
    const fornecedorId = Number(formData.get('fornecedorId'));
    const unidadeId    = Number(formData.get('unidadeId'));
    const fontePrecoMat = (String(formData.get('fontePrecoMat') || '') || null) as FonteMat;
    const fontePrecoMo  = (String(formData.get('fontePrecoMo')  || '') || null) as FonteMo;
    const quantidade    = parseNum(formData.get('quantidade'));

    if (!produtoId || !fornecedorId || !unidadeId)
      throw new Error('Produto, fornecedor e unidade são obrigatórios.');
    if (quantidade == null || quantidade <= 0)
      throw new Error('Quantidade inválida.');

    // valida posse dos cadastros
    const [okUM, okProd, okForn] = await Promise.all([
      prisma.unidadeMedida.findFirst({ where: { id: unidadeId, usuarioId }, select: { id: true } }),
      prisma.produtoServico.findFirst({ where: { id: produtoId, usuarioId }, select: { id: true } }),
      prisma.fornecedor.findFirst({ where: { id: fornecedorId, usuarioId }, select: { id: true } }),
    ]);
    if (!okUM)   throw new Error('Unidade de medida não encontrada para este usuário.');
    if (!okProd) throw new Error('Produto/serviço não encontrado para este usuário.');
    if (!okForn) throw new Error('Fornecedor não encontrado para este usuário.');

    const { mat, mo } = await pickPrecoFromVinculo(usuarioId, fornecedorId, produtoId, fontePrecoMat, fontePrecoMo);

    const valorUnitMat = round2(mat);
    const valorUnitMo  = round2(mo);
    const totalItem    = round2((quantidade ?? 0) * ((valorUnitMat ?? 0) + (valorUnitMo ?? 0)));

    await prisma.estimativaItem.create({
      data: {
        estimativaId,
        produtoId,
        fornecedorId,
        unidadeId,
        usuarioId,
        quantidade: Math.round((quantidade as number) * 1000) / 1000,
        fontePrecoMat: fontePrecoMat as any,
        fontePrecoMo:  fontePrecoMo  as any,
        valorUnitMat,
        valorUnitMo,
        totalItem,
      },
    });

    if (est.projetoId) revalidatePath(`/projetos/${est.projetoId}/itens`);
  } catch (err) {
    console.error('[adicionarItem]', err);
    await backToItensWithError(estimativaId, err);
  }
}

export async function excluirItem(formData: FormData) {
  const estimativaId = Number(formData.get('estimativaId'));
  try {
    const usuarioId = await getMeUsuarioId();
    const id = Number(formData.get('id'));
    if (!id || !estimativaId) throw new Error('Item inválido');

    // valida que o item pertence a uma estimativa do usuário
    const item = await prisma.estimativaItem.findFirst({
      where: { id, usuarioId, estimativaId },
      select: { id: true },
    });
    if (!item) throw new Error('Item não pertence ao usuário.');

    const est = await prisma.estimativa.findFirst({
      where: { id: estimativaId, usuarioId }, select: { projetoId: true }
    });

    await prisma.estimativaItem.delete({ where: { id } });

    if (est?.projetoId)
      revalidatePath(`/projetos/${est.projetoId}/itens`);
  } catch (err) {
    console.error('[excluirItem]', err);
    await backToItensWithError(estimativaId, err);
  }
}

export async function atualizarItem(formData: FormData) {
  const estimativaId = Number(formData.get('estimativaId'));
  try {
    const usuarioId = await getMeUsuarioId();

    const id           = Number(formData.get('id'));
    const produtoId    = Number(formData.get('produtoId'));
    const fornecedorId = Number(formData.get('fornecedorId'));
    const unidadeId    = Number(formData.get('unidadeId'));
    const quantidade   = parseNum(formData.get('quantidade'));
    const fontePrecoMat = (String(formData.get('fontePrecoMat') || '') || null) as FonteMat;
    const fontePrecoMo  = (String(formData.get('fontePrecoMo')  || '') || null) as FonteMo;

    if (!id || !estimativaId || !produtoId || !fornecedorId || !unidadeId)
      throw new Error('Dados do item inválidos.');
    if (quantidade == null || quantidade <= 0)
      throw new Error('Quantidade inválida.');

    // valida que a estimativa é do usuário
    const est = await prisma.estimativa.findFirst({
      where: { id: estimativaId, usuarioId },
      select: { projetoId: true },
    });
    if (!est) throw new Error('Estimativa não pertence ao usuário.');

    // valida posse dos cadastros
    const [okUM, okProd, okForn] = await Promise.all([
      prisma.unidadeMedida.findFirst({ where: { id: unidadeId, usuarioId }, select: { id: true } }),
      prisma.produtoServico.findFirst({ where: { id: produtoId, usuarioId }, select: { id: true } }),
      prisma.fornecedor.findFirst({ where: { id: fornecedorId, usuarioId }, select: { id: true } }),
    ]);
    if (!okUM)   throw new Error('Unidade de medida não encontrada para este usuário.');
    if (!okProd) throw new Error('Produto/serviço não encontrado para este usuário.');
    if (!okForn) throw new Error('Fornecedor não encontrado para este usuário.');

    const { mat, mo } = await pickPrecoFromVinculo(usuarioId, fornecedorId, produtoId, fontePrecoMat, fontePrecoMo);

    const valorUnitMat = round2(mat);
    const valorUnitMo  = round2(mo);
    const totalItem    = round2((quantidade ?? 0) * ((valorUnitMat ?? 0) + (valorUnitMo ?? 0)));

    await prisma.estimativaItem.update({
      where: { id },
      data: {
        fornecedorId,
        unidadeId,
        usuarioId,
        quantidade: Math.round((quantidade as number) * 1000) / 1000,
        fontePrecoMat: fontePrecoMat as any,
        fontePrecoMo:  fontePrecoMo  as any,
        valorUnitMat,
        valorUnitMo,
        totalItem,
      },
    });

    if (est?.projetoId)
      revalidatePath(`/projetos/${est.projetoId}/itens`);
  } catch (err) {
    console.error('[atualizarItem]', err);
    await backToItensWithError(estimativaId, err);
  }
}
