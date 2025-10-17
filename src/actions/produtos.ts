'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';

/** Helpers de parse */
function toStr(v: FormDataEntryValue | null) {
  return (typeof v === 'string' ? v : '').trim();
}
function toNum(v: FormDataEntryValue | null) {
  const n = Number(typeof v === 'string' ? v : '');
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Se seu schema Prisma NÃO tem 'AMBOS' no enum,
 * mapeamos para `null` (ou escolha 'PRODUTO' como default).
 * Se seu enum tem 'AMBOS', troque o retorno para 'AMBOS'.
 */
function mapTipo(v: FormDataEntryValue | null): 'PRODUTO' | 'SERVICO' | null {
  const t = toStr(v).toUpperCase();
  if (t === 'PRODUTO') return 'PRODUTO';
  if (t === 'SERVICO') return 'SERVICO';
  // 'AMBOS' ou vazio -> null (compatível com coluna nullable)
  return null;
}

/** CREATE (cadastro básico) */
export async function criarProduto(formData: FormData) {
  try {
    const nome = toStr(formData.get('nome'));
    const unidadeMedidaId = toNum(formData.get('unidadeMedidaId'));
    const categoria = toStr(formData.get('categoria')) || null;
    const tipo = mapTipo(formData.get('tipo')) as any; // pode ser enum ou null

    if (!nome) return { error: 'Nome é obrigatório.' };
    if (!Number.isFinite(unidadeMedidaId)) {
      return { error: 'Selecione uma unidade de medida válida.' };
    }

    await prisma.produtoServico.create({
      data: { nome, unidadeMedidaId, categoria, tipo },
    });

    revalidatePath('/cadastros/produtos');
    return { ok: true };
  } catch (err: any) {
    console.error('criarProduto:', err);
    return { error: 'Falha ao criar o produto.' };
  }
}

/** UPDATE (cadastro básico) */
export async function atualizarProduto(formData: FormData) {
  try {
    const id = toNum(formData.get('id'));
    if (!Number.isFinite(id)) return { error: 'ID inválido.' };

    const nome = toStr(formData.get('nome'));
    const unidadeMedidaId = toNum(formData.get('unidadeMedidaId'));
    const categoria = toStr(formData.get('categoria')) || null;
    const tipo = mapTipo(formData.get('tipo')) as any;

    if (!nome) return { error: 'Nome é obrigatório.' };
    if (!Number.isFinite(unidadeMedidaId)) {
      return { error: 'Selecione uma unidade de medida válida.' };
    }

    await prisma.produtoServico.update({
      where: { id },
      data: { nome, unidadeMedidaId, categoria, tipo },
    });

    revalidatePath('/cadastros/produtos');
    return { ok: true };
  } catch (err: any) {
    console.error('atualizarProduto:', err);
    return { error: 'Falha ao atualizar o produto.' };
  }
}

/** DELETE */
export async function excluirProduto(formData: FormData) {
  try {
    const id = toNum(formData.get('id'));
    if (!Number.isFinite(id)) return { error: 'ID inválido.' };

    await prisma.produtoServico.delete({ where: { id } });
    revalidatePath('/cadastros/produtos');
    return { ok: true };
  } catch (err: any) {
    console.error('excluirProduto:', err);
    return { error: 'Falha ao excluir o produto.' };
  }
}
