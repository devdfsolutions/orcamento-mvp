'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function criarUnidade(formData: FormData) {
  const sigla = String(formData.get('sigla') || '').trim();
  const nome = String(formData.get('nome') || '').trim();

  if (!sigla || !nome) return;

  await prisma.unidadeMedida.upsert({
    where: { sigla },
    update: { nome },
    create: { sigla, nome },
  });

  revalidatePath('/cadastros/unidades');
}

export async function excluirUnidade(id: number) {
  // vai dar erro se a UM estiver em uso (produto/itens). Isso é ok no MVP.
  await prisma.unidadeMedida.delete({ where: { id } });
  revalidatePath('/cadastros/unidades');
}
