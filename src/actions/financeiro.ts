'use server';

import { prisma } from '@/lib/prisma';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

/** Descobre o usuarioId (interno) a partir do Supabase */
async function meId() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado.');
  const me = await prisma.usuario.findUnique({
    where: { supabaseUserId: user.id },
    select: { id: true },
  });
  if (!me) throw new Error('Usuário da aplicação não encontrado.');
  return me.id;
}

/**
 * Salva (upsert) AJUSTE FINANCEIRO para UM ITEM da estimativa.
 * Chave lógica: (usuarioId, projetoId, estimativaItemId)
 * - Se já existir, atualiza.
 * - Se não, cria.
 *
 * Espera no form:
 *   projetoId, estimativaItemId, percentual, valorFixo, observacao
 */
export async function salvarAjusteDoItem(formData: FormData) {
  const usuarioId = await meId();

  const projetoId        = Number(formData.get('projetoId'));
  const estimativaItemId = Number(formData.get('estimativaItemId'));
  const percentualRaw    = String(formData.get('percentual') ?? '').trim();
  const valorFixoRaw     = String(formData.get('valorFixo') ?? '').trim();
  const observacao       = (String(formData.get('observacao') ?? '').trim() || null) as string | null;

  if (!Number.isFinite(projetoId) || !Number.isFinite(estimativaItemId)) {
    throw new Error('Projeto/Item inválido.');
  }

  // converte “10,5” → 10.5 etc.
  const toNum = (s: string) => {
    if (!s) return null;
    const n = Number(s.replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  };
  const percentual = toNum(percentualRaw); // ex.: 10.000 => +10%
  const valorFixo  = toNum(valorFixoRaw);  // em R$

  // segurança: item precisa pertencer ao mesmo projeto
  const item = await prisma.estimativaItem.findUnique({
    where: { id: estimativaItemId },
    select: { estimativa: { select: { projetoId: true } } },
  });
  if (!item || item.estimativa.projetoId !== projetoId) {
    throw new Error('Item não pertence ao projeto informado.');
  }

  // procura ajuste existente
  const existing = await prisma.financeiroAjuste.findFirst({
    where: { usuarioId, projetoId, estimativaItemId },
    select: { id: true },
  });

  if (existing) {
    await prisma.financeiroAjuste.update({
      where: { id: existing.id },
      data: { percentual, valorFixo, observacao },
    });
  } else {
    await prisma.financeiroAjuste.create({
      data: {
        usuarioId,
        projetoId,
        estimativaItemId,
        percentual,
        valorFixo,
        observacao,
      },
    });
  }

  // revalida páginas relacionadas ao projeto (itens/financeiro)
  revalidatePath(`/projetos/${projetoId}/itens`);
  revalidatePath(`/projetos/${projetoId}/financeiro`);
  redirect(`/projetos/${projetoId}/itens?ok=1`);
}
