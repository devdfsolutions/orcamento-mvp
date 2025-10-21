// src/actions/financeiro.ts
'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function salvarResumoFinanceiro(formData: FormData) {
  const projetoId = Number(formData.get('projetoId'));
  const recebemos = Number(String(formData.get('recebemos') || '0').replace(',', '.'));
  const observacoes = String(formData.get('observacoes') || '');

  await prisma.resumoProjeto.upsert({
    where: { projetoId },
    create: { projetoId, recebemos, observacoes },
    update: { recebemos, observacoes },
  });

  revalidatePath(`/projetos/${projetoId}/financeiro`);
}

// ======================================================
// NOVAS ACTIONS – versão segura sem includes arriscados
// ======================================================

type AjusteItemPayload = {
  estimativaItemId: number;
  percentual: number | null;
  valorFixo: number | null;
  observacao: string | null;
  aplicarEmSimilares: boolean;
  grupoSimilar: string | null;
};

export async function upsertAjustesFinanceiros(input: {
  projetoId: number;
  usuarioId: number;
  itens: AjusteItemPayload[];
}) {
  const { projetoId, usuarioId, itens } = input;

  // Busca somente os IDs dos itens da estimativa aprovada
  const estimativa = await prisma.estimativa.findFirst({
    where: { projetoId, aprovada: true },
    include: {
      itens: {
        select: { id: true },
      },
    },
  });

  if (!estimativa) return;

  const itemIdsSet = new Set(estimativa.itens.map((i) => i.id));

  const creates: Parameters<typeof prisma.financeiroAjuste.create>[] = [];

  for (const it of itens) {
    if (!itemIdsSet.has(it.estimativaItemId)) continue;

    // aplica só nos selecionados — não busca similares por nome
    const alvoIds: number[] = [it.estimativaItemId];

    for (const alvoId of alvoIds) {
      creates.push({
        data: {
          usuarioId: Number.isFinite(usuarioId) ? usuarioId : 0,
          projetoId,
          estimativaItemId: alvoId,
          percentual: it.percentual != null ? it.percentual : null,
          valorFixo: it.valorFixo != null ? it.valorFixo : null,
          observacao: it.observacao,
        },
      });
    }
  }

  if (creates.length > 0) {
    await prisma.$transaction(creates.map((c) => prisma.financeiroAjuste.create(c)));
  }

  revalidatePath(`/projetos/${projetoId}/financeiro`);
}

export async function aplicarHonorarios(formData: FormData) {
  const projetoId = Number(formData.get('projetoId'));
  const usuarioId = Number(formData.get('usuarioId') || 0);
  const percentual = Number(String(formData.get('percentual') || '').replace(',', '.'));

  if (!Number.isFinite(percentual)) {
    revalidatePath(`/projetos/${projetoId}/financeiro`);
    return;
  }

  await prisma.financeiroAjuste.create({
    data: {
      usuarioId: Number.isFinite(usuarioId) ? usuarioId : 0,
      projetoId,
      percentual,
      valorFixo: null,
      observacao: 'HONORARIOS',
    },
  });

  revalidatePath(`/projetos/${projetoId}/financeiro`);
}

export async function gerarPdfApresentacao(formData: FormData) {
  const projetoId = Number(formData.get('projetoId'));
  // TODO: montar o PDF dos valores ajustados e enviar para download
  revalidatePath(`/projetos/${projetoId}/financeiro`);
}
