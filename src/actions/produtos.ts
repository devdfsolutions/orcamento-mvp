'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

/** Normaliza enum vindo do formulário */
function parseTipo(v: FormDataEntryValue | null): 'PRODUTO' | 'SERVICO' | 'AMBOS' {
  const t = String(v ?? 'AMBOS').toUpperCase();
  if (t === 'PRODUTO' || t === 'SERVICO' || t === 'AMBOS') return t;
  return 'AMBOS';
}

/** CREATE (sem preços) */
export async function criarProduto(formData: FormData) {
  const nome = String(formData.get('nome') ?? '').trim();
  const unidadeMedidaId = Number(formData.get('unidadeMedidaId'));
  const categoria = (String(formData.get('categoria') ?? '').trim() || null) as string | null;
  const tipo = parseTipo(formData.get('tipo'));

  if (!nome) throw new Error('Nome é obrigatório.');
  if (!Number.isFinite(unidadeMedidaId)) throw new Error('Unidade de medida inválida.');

  await prisma.produtoServico.create({
    data: { nome, unidadeMedidaId, categoria, tipo },
  });

  // garante atualização na volta
  revalidatePath('/cadastros/produtos');
  redirect('/cadastros/produtos');
}

/** UPDATE (sem preços) */
export async function atualizarProduto(formData: FormData) {
  const id = Number(formData.get('id'));
  if (!Number.isFinite(id)) throw new Error('ID inválido.');

  const nome = String(formData.get('nome') ?? '').trim();
  const unidadeMedidaId = Number(formData.get('unidadeMedidaId'));
  const categoria = (String(formData.get('categoria') ?? '').trim() || null) as string | null;
  const tipo = parseTipo(formData.get('tipo'));

  if (!nome) throw new Error('Nome é obrigatório.');
  if (!Number.isFinite(unidadeMedidaId)) throw new Error('Unidade de medida inválida.');

  await prisma.produtoServico.update({
    where: { id },
    data: { nome, unidadeMedidaId, categoria, tipo },
  });

  revalidatePath('/cadastros/produtos');
  redirect('/cadastros/produtos');
}

/** DELETE */
export async function excluirProduto(formData: FormData) {
  const id = Number(formData.get('id'));
  if (!Number.isFinite(id)) throw new Error('ID inválido.');

  await prisma.produtoServico.delete({ where: { id } });

  revalidatePath('/cadastros/produtos');
  redirect('/cadastros/produtos');
}
