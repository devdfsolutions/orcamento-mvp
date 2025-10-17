'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const PAGE = '/cadastros/unidades';

function backWithError(err: unknown) {
  const msg =
    (err as any)?.message ??
    (typeof err === 'string' ? err : 'Erro inesperado ao salvar.');
  console.error('[unidades action]', err);
  redirect(`${PAGE}?e=${encodeURIComponent(msg)}`);
}

/** Upsert por sigla (cria ou atualiza o nome) */
export async function criarUnidade(formData: FormData) {
  try {
    let sigla = String(formData.get('sigla') || '').trim();
    const nome = String(formData.get('nome') || '').trim();

    if (!sigla) throw new Error('Informe a sigla.');
    if (!nome) throw new Error('Informe o nome da unidade.');

    // normaliza (chave é a sigla)
    sigla = sigla.toUpperCase();

    await prisma.unidadeMedida.upsert({
      where: { sigla },
      update: { nome },
      create: { sigla, nome },
    });

    revalidatePath(PAGE);
    redirect(`${PAGE}?ok=1`);
  } catch (err) {
    backWithError(err);
  }
}

/** Excluir por ID (vai falhar se estiver em uso — ok para o MVP) */
export async function excluirUnidade(id: number) {
  try {
    await prisma.unidadeMedida.delete({ where: { id } });
    revalidatePath(PAGE);
    redirect(`${PAGE}?ok=1`);
  } catch (err) {
    backWithError(err);
  }
}
