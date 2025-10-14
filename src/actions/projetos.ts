'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

/** Atualizar nome/status/cliente */
export async function atualizarProjeto(formData: FormData) {
  const id = Number(formData.get('id'));
  const nome = String(formData.get('nome') ?? '').trim();
  const status = String(formData.get('status') ?? '').trim();
  const clienteIdRaw = String(formData.get('clienteId') ?? '').trim();
  const clienteId = clienteIdRaw ? Number(clienteIdRaw) : null;

  if (!id || !nome) throw new Error('Dados inválidos');

  await prisma.projeto.update({
    where: { id },
    data: {
      nome,
      status,
      clienteId: clienteId ?? null,
    },
  });

  revalidatePath('/projetos');
  revalidatePath(`/projetos/${id}`);
}

/** Excluir um projeto (cascata via FK/Prisma) */
export async function excluirProjeto(formData: FormData) {
  const id = Number(formData.get('id'));
  if (!id) throw new Error('Projeto inválido');

  await prisma.projeto.delete({ where: { id } });

  revalidatePath('/projetos');
}

/** Excluir vários projetos de uma vez (checkbox + botão) */
export async function excluirProjetosEmLote(formData: FormData) {
  // form envia vários "ids"
  const idsRaw = formData.getAll('ids');
  const ids = idsRaw.map(v => Number(v)).filter(n => Number.isFinite(n));

  if (!ids.length) throw new Error('Selecione ao menos um projeto.');

  await prisma.projeto.deleteMany({
    where: { id: { in: ids } },
  });

  revalidatePath('/projetos');
}
