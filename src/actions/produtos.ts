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

const PAGE = '/cadastros/produtos';

function backWithError(err: unknown) {
  const msg =
    (err as any)?.message ??
    (typeof err === 'string' ? err : 'Erro inesperado ao salvar.');
  // opcional: registra no log do servidor
  console.error('[produtos action]', err);
  redirect(`${PAGE}?e=${encodeURIComponent(msg)}`);
}

/** CREATE (sem preços) */
export async function criarProduto(formData: FormData) {
  try {
    const nome = String(formData.get('nome') ?? '').trim();
    const unidadeMedidaId = Number(formData.get('unidadeMedidaId'));
    const categoria = (String(formData.get('categoria') ?? '').trim() || null) as string | null;
    const tipo = parseTipo(formData.get('tipo'));

    if (!nome) throw new Error('Nome é obrigatório.');
    if (!Number.isFinite(unidadeMedidaId)) throw new Error('Unidade de medida inválida.');

    // valida FK explicitamente (evita P2003 genérico)
    const um = await prisma.unidadeMedida.findUnique({ where: { id: unidadeMedidaId } });
    if (!um) throw new Error('Unidade de medida não encontrada.');

    await prisma.produtoServico.create({
      data: { nome, unidadeMedidaId, categoria, tipo },
    });

    revalidatePath(PAGE);
    redirect(`${PAGE}?ok=1`);
  } catch (err) {
    backWithError(err);
  }
}

/** UPDATE (sem preços) */
export async function atualizarProduto(formData: FormData) {
  try {
    const id = Number(formData.get('id'));
    if (!Number.isFinite(id)) throw new Error('ID inválido.');

    const nome = String(formData.get('nome') ?? '').trim();
    const unidadeMedidaId = Number(formData.get('unidadeMedidaId'));
    const categoria = (String(formData.get('categoria') ?? '').trim() || null) as string | null;
    const tipo = parseTipo(formData.get('tipo'));

    if (!nome) throw new Error('Nome é obrigatório.');
    if (!Number.isFinite(unidadeMedidaId)) throw new Error('Unidade de medida inválida.');

    const um = await prisma.unidadeMedida.findUnique({ where: { id: unidadeMedidaId } });
    if (!um) throw new Error('Unidade de medida não encontrada.');

    await prisma.produtoServico.update({
      where: { id },
      data: { nome, unidadeMedidaId, categoria, tipo },
    });

    revalidatePath(PAGE);
    redirect(`${PAGE}?ok=1`);
  } catch (err) {
    backWithError(err);
  }
}

/** DELETE */
export async function excluirProduto(formData: FormData) {
  try {
    const id = Number(formData.get('id'));
    if (!Number.isFinite(id)) throw new Error('ID inválido.');

    await prisma.produtoServico.delete({ where: { id } });

    revalidatePath(PAGE);
    redirect(`${PAGE}?ok=1`);
  } catch (err) {
    backWithError(err);
  }
}
