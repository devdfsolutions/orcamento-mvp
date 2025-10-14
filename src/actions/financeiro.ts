// src/actions/financeiro.ts
'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function salvarResumoFinanceiro(formData: FormData) {
  const projetoId = Number(formData.get('projetoId'));
  const recebemos = Number(String(formData.get('recebemos') || '0').replace(',', '.'));
  const observacoes = String(formData.get('observacoes') || '');

  // se não existir resumo, cria; se existir, atualiza
  await prisma.resumoProjeto.upsert({
    where: { projetoId },
    create: { projetoId, recebemos, observacoes },
    update: { recebemos, observacoes },
  });

  // revalida a página para refletir o novo valor
  revalidatePath(`/projetos/${projetoId}/financeiro`);
}
