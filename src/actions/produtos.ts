'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';

/** Normaliza enum do tipo vindo do formulário */
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

  if (!nome || !unidadeMedidaId) {
    throw new Error('Nome e Unidade de Medida são obrigatórios.');
  }

  await prisma.produtoServico.create({
    data: {
      nome,
      unidadeMedidaId,
      categoria,
      tipo,
      // OBS: não mexemos em refPrecoP1/2/3 aqui; tela passou a ser só cadastro básico
    },
  });

  revalidatePath('/cadastros/produtos');
}

/** UPDATE (sem preços) */
export async function atualizarProduto(formData: FormData) {
  const id = Number(formData.get('id'));
  if (!id) throw new Error('ID inválido.');

  const nome = String(formData.get('nome') ?? '').trim();
  const unidadeMedidaId = Number(formData.get('unidadeMedidaId'));
  const categoria = (String(formData.get('categoria') ?? '').trim() || null) as string | null;
  const tipo = parseTipo(formData.get('tipo'));

  if (!nome || !unidadeMedidaId) {
    throw new Error('Nome e Unidade de Medida são obrigatórios.');
  }

  await prisma.produtoServico.update({
    where: { id },
    data: {
      nome,
      unidadeMedidaId,
      categoria,
      tipo,
      // Sem tocar em refPrecoP1/2/3
    },
  });

  revalidatePath('/cadastros/produtos');
}

/** DELETE */
export async function excluirProduto(formData: FormData) {
  const id = Number(formData.get('id'));
  if (!id) throw new Error('ID inválido');

  await prisma.produtoServico.delete({ where: { id } });
  revalidatePath('/cadastros/produtos');
}
