// src/actions/financeiro.ts
'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// helper
function toNum(v: any, fallback = 0): number {
  if (v == null) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

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

// ===================== AJUSTES =====================

type AjusteItemPayload = {
  estimativaItemId: number;
  percentual: number | null;
  valorFixo: number | null;
  observacao: string | null;
  aplicarEmSimilares: boolean;
  grupoSimilar: string | null; // aqui será o nome do produto
};

export async function upsertAjustesFinanceiros(input: {
  projetoId: number;
  usuarioId: number;
  itens: AjusteItemPayload[];
}) {
  const { projetoId, usuarioId, itens } = input;

  // Busca estimativa aprovada e nomes dos produtos para permitir "similares"
  const estimativa = await prisma.estimativa.findFirst({
    where: { projetoId, aprovada: true },
    include: {
      itens: {
        select: {
          id: true,
          produto: { select: { nome: true } },
        },
      },
    },
  });

  if (!estimativa) {
    revalidatePath(`/projetos/${projetoId}/financeiro`);
    return;
  }

  // Mapas auxiliares
  const itemProdutoNome = new Map<number, string | null>(
    estimativa.itens.map((i) => [i.id, i.produto?.nome ?? null])
  );

  const creates: Parameters<typeof prisma.financeiroAjuste.create>[] = [];

  for (const it of itens) {
    // sempre aplica no item selecionado
    const alvoIds = new Set<number>([it.estimativaItemId]);

    // aplica em similares pelo mesmo nome de produto (se pedido)
    if (it.aplicarEmSimilares && it.grupoSimilar) {
      for (const row of estimativa.itens) {
        const nome = itemProdutoNome.get(row.id);
        if (nome && nome === it.grupoSimilar) {
          alvoIds.add(row.id);
        }
      }
    }

    for (const alvoId of Array.from(alvoIds)) {
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
      // ajuste no nível do projeto (sem estimativaItemId/produtoId)
      percentual,
      valorFixo: null,
      observacao: 'HONORARIOS',
    },
  });

  revalidatePath(`/projetos/${projetoId}/financeiro`);
}

// Placeholder do PDF (mantém fluxo estável)
export async function gerarPdfApresentacao(formData: FormData) {
  const projetoId = Number(formData.get('projetoId'));
  // TODO: montar o PDF com os valores ajustados
  revalidatePath(`/projetos/${projetoId}/financeiro`);
}
