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

// ------- NOVAS ACTIONS -------

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

  // Descobre a estimativa aprovada do projeto
  const estimativa = await prisma.estimativa.findFirst({
    where: { projetoId, aprovada: true },
    include: {
      itens: {
        include: {
          produtoServico: { select: { nome: true } },
        },
      },
    },
  });

  if (!estimativa) {
    return;
  }

  // Prepara lotes de inserção
  const creates: Parameters<typeof prisma.financeiroAjuste.create>[] = [];

  for (const it of itens) {
    // lista de itens-alvo
    let alvoIds: number[] = [it.estimativaItemId];

    if (it.aplicarEmSimilares && it.grupoSimilar) {
      const similares = estimativa.itens.filter(
        (row) =>
          (row.produtoServico?.nome || (row as any).nome || null) === it.grupoSimilar
      );
      const similaresIds = similares.map((s) => s.id);
      alvoIds = Array.from(new Set([...alvoIds, ...similaresIds]));
    }

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
      // sem estimativaItemId => ajuste no nível do projeto
      percentual,
      valorFixo: null,
      observacao: 'HONORARIOS',
    },
  });

  revalidatePath(`/projetos/${projetoId}/financeiro`);
}

// MVP: placeholder – aqui você pode montar o PDF com um template e bibliotecas como pdf-lib ou @react-pdf/renderer.
// Por hora só revalida a página para não quebrar o fluxo do usuário.
export async function gerarPdfApresentacao(formData: FormData) {
  const projetoId = Number(formData.get('projetoId'));
  // TODO: montar o PDF dos valores ajustados e enviar para download/armazenar
  revalidatePath(`/projetos/${projetoId}/financeiro`);
}
