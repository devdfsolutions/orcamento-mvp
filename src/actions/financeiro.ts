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

/* ===================== AJUSTES POR ITEM ===================== */

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
  usuarioId: number; // se vier 0/NaN, usamos o dono do projeto
  itens: AjusteItemPayload[];
}) {
  const { projetoId, usuarioId, itens } = input;

  // fallback: dono do projeto
  const projeto = await prisma.projeto.findUnique({
    where: { id: projetoId },
    select: { usuarioId: true },
  });
  const usuarioIdEfetivo = Number.isFinite(usuarioId) && usuarioId > 0
    ? usuarioId
    : (projeto?.usuarioId ?? 1); // último fallback defensivo

  const estimativa = await prisma.estimativa.findFirst({
    where: { projetoId },
    include: {
      itens: {
        include: { produto: { select: { nome: true } } },
      },
    },
  });
  if (!estimativa) {
    return { ok: false, message: 'Estimativa não encontrada.' };
  }

  const creates: Parameters<typeof prisma.financeiroAjuste.create>[] = [];

  for (const it of itens) {
    let alvoIds: number[] = [it.estimativaItemId];

    if (it.aplicarEmSimilares && it.grupoSimilar) {
      const similares = estimativa.itens.filter(
        (row) => (row.produto?.nome || (row as any).nome || null) === it.grupoSimilar
      );
      const similaresIds = similares.map((s) => s.id);
      alvoIds = Array.from(new Set([...alvoIds, ...similaresIds]));
    }

    for (const alvoId of alvoIds) {
      creates.push({
        data: {
          usuarioId: usuarioIdEfetivo,
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
  return { ok: true };
}

/* ===================== HONORÁRIOS ===================== */

// uso via <form action={aplicarHonorarios}>
export async function aplicarHonorarios(formData: FormData) {
  const projetoId = Number(formData.get('projetoId'));
  const usuarioId = Number(formData.get('usuarioId') || 0);
  const percentual = Number(String(formData.get('percentual') || '').replace(',', '.'));

  return aplicarHonorariosDirect({ projetoId, usuarioId, percentual });
}

// uso direto no client (toolbar)
export async function aplicarHonorariosDirect(input: {
  projetoId: number;
  usuarioId: number;
  percentual: number;
}) {
  const { projetoId, usuarioId, percentual } = input;

  const projeto = await prisma.projeto.findUnique({
    where: { id: projetoId },
    select: { usuarioId: true },
  });
  const usuarioIdEfetivo = Number.isFinite(usuarioId) && usuarioId > 0
    ? usuarioId
    : (projeto?.usuarioId ?? 1);

  if (!Number.isFinite(percentual)) {
    revalidatePath(`/projetos/${projetoId}/financeiro`);
    return { ok: false, message: 'Percentual inválido.' };
  }

  await prisma.financeiroAjuste.create({
    data: {
      usuarioId: usuarioIdEfetivo,
      projetoId,
      percentual,
      valorFixo: null,
      observacao: 'HONORARIOS',
    },
  });

  revalidatePath(`/projetos/${projetoId}/financeiro`);
  return { ok: true };
}

/* ===================== PDF (placeholder seguro) ===================== */
export async function gerarPdfApresentacao(formData: FormData) {
  const projetoId = Number(formData.get('projetoId'));
  // TODO: implementar geração do PDF
  revalidatePath(`/projetos/${projetoId}/financeiro`);
  return { ok: true };
}
