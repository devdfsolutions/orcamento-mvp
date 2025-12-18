"use server";

import { prisma } from "@/lib/prisma";
import { authUser } from "@/lib/authUser";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { FontePrecoMaterial, FontePrecoMO } from "@prisma/client";

const num = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").replace(",", ".").trim();
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

const int = (v: FormDataEntryValue | null) => {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) ? n : 0;
};

function asFonteMat(v: FormDataEntryValue | null): FontePrecoMaterial | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  if (s === "P1" || s === "P2" || s === "P3" || s === "MANUAL") return s;
  return null;
}

function asFonteMo(v: FormDataEntryValue | null): FontePrecoMO | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  if (s === "M1" || s === "M2" || s === "M3" || s === "MANUAL") return s;
  return null;
}

/**
 * Aceita:
 *  - "10%"  => percent=10
 *  - "10"   => fixo=10
 *  - "1000" => fixo=1000
 *  - ""     => sem ajuste
 */
function parseAjuste(v: FormDataEntryValue | null): {
  ajusteTipo: "percent" | "fixo" | null;
  ajusteValor: number | null;
} {
  const raw = String(v ?? "").trim();
  if (!raw) return { ajusteTipo: null, ajusteValor: null };

  const isPercent = raw.includes("%");
  const cleaned = raw.replace("%", "").replace(",", ".").trim();
  const n = Number(cleaned);

  if (!Number.isFinite(n)) return { ajusteTipo: null, ajusteValor: null };
  if (isPercent) return { ajusteTipo: "percent", ajusteValor: n };
  return { ajusteTipo: "fixo", ajusteValor: n };
}

function calcTotal(
  quantidade: number,
  valorUnitMat: number,
  valorUnitMo: number,
  ajusteTipo: "percent" | "fixo" | null,
  ajusteValor: number | null
) {
  const base = quantidade * (valorUnitMat + valorUnitMo);
  if (!ajusteTipo || ajusteValor == null) return base;

  if (ajusteTipo === "percent") return base * (1 + ajusteValor / 100);
  return base + ajusteValor; // fixo
}

function backWithError(url: string, err: unknown) {
  const msg =
    err instanceof Error
      ? err.message
      : typeof err === "string"
      ? err
      : "Erro inesperado.";
  console.error("[estimativas action]", err);
  redirect(`${url}?e=${encodeURIComponent(msg)}`);
}

function moneyToStr(n: number, dec = 2) {
  if (!Number.isFinite(n)) return (0).toFixed(dec);
  return n.toFixed(dec);
}

function pickMatPrice(args: {
  fonte: FontePrecoMaterial | null;
  vinculo: {
    precoMatP1: unknown;
    precoMatP2: unknown;
    precoMatP3: unknown;
  } | null;
  produto: {
    refPrecoP1: unknown;
    refPrecoP2: unknown;
    refPrecoP3: unknown;
  };
  fallbackCurrent?: number;
}) {
  const { fonte, vinculo, produto, fallbackCurrent = 0 } = args;

  if (!fonte) return 0;
  if (fonte === "MANUAL") return fallbackCurrent;

  const v = (x: unknown) => Number(x ?? 0);

  if (fonte === "P1") return v(vinculo?.precoMatP1) || v(produto.refPrecoP1) || 0;
  if (fonte === "P2") return v(vinculo?.precoMatP2) || v(produto.refPrecoP2) || 0;
  if (fonte === "P3") return v(vinculo?.precoMatP3) || v(produto.refPrecoP3) || 0;

  return 0;
}

function pickMoPrice(args: {
  fonte: FontePrecoMO | null;
  vinculo: {
    precoMoM1: unknown;
    precoMoM2: unknown;
    precoMoM3: unknown;
  } | null;
  fallbackCurrent?: number;
}) {
  const { fonte, vinculo, fallbackCurrent = 0 } = args;

  if (!fonte) return 0;
  if (fonte === "MANUAL") return fallbackCurrent;

  const v = (x: unknown) => Number(x ?? 0);

  if (fonte === "M1") return v(vinculo?.precoMoM1) || 0;
  if (fonte === "M2") return v(vinculo?.precoMoM2) || 0;
  if (fonte === "M3") return v(vinculo?.precoMoM3) || 0;

  return 0;
}

export async function ensureEstimativa(projetoId: number) {
  const { id: usuarioId } = await authUser();

  const existing = await prisma.estimativa.findFirst({
    where: { usuarioId, projetoId },
    orderBy: { id: "desc" },
    select: { id: true },
  });

  if (existing?.id) return existing.id;

  const created = await prisma.estimativa.create({
    data: {
      usuarioId,
      projetoId,
      nome: `Estimativa ${new Date().toLocaleDateString("pt-BR")}`,
      aprovada: false,
    },
    select: { id: true },
  });

  return created.id;
}

export async function adicionarItem(formData: FormData) {
  const { id: usuarioId } = await authUser();

  const estimativaId = int(formData.get("estimativaId"));
  const produtoId = int(formData.get("produtoId"));
  const fornecedorId = int(formData.get("fornecedorId"));
  const quantidade = num(formData.get("quantidade"));

  const fontePrecoMat = asFonteMat(formData.get("fontePrecoMat"));
  const fontePrecoMo = asFonteMo(formData.get("fontePrecoMo"));
  const { ajusteTipo, ajusteValor } = parseAjuste(formData.get("ajuste"));

  if (!estimativaId) return backWithError("/projetos", "Estimativa inválida.");
  if (!produtoId) return backWithError("/projetos", "Produto inválido.");
  if (!fornecedorId) return backWithError("/projetos", "Fornecedor inválido.");
  if (!quantidade || quantidade <= 0)
    return backWithError("/projetos", "Quantidade inválida.");

  // produto (pra pegar unidade e refs)
  const produto = await prisma.produtoServico.findFirst({
    where: { id: produtoId, usuarioId },
    select: {
      unidadeMedidaId: true,
      refPrecoP1: true,
      refPrecoP2: true,
      refPrecoP3: true,
    },
  });
  if (!produto) return backWithError("/projetos", "Produto não encontrado.");

  const unidadeId = produto.unidadeMedidaId;

  // vínculo (FornecedorProduto)
  const vinculo = await prisma.fornecedorProduto.findFirst({
    where: { usuarioId, fornecedorId, produtoId },
    select: {
      precoMatP1: true,
      precoMatP2: true,
      precoMatP3: true,
      precoMoM1: true,
      precoMoM2: true,
      precoMoM3: true,
    },
  });

  const valorUnitMat = pickMatPrice({
    fonte: fontePrecoMat,
    vinculo,
    produto,
    fallbackCurrent: 0,
  });

  const valorUnitMo = pickMoPrice({
    fonte: fontePrecoMo,
    vinculo,
    fallbackCurrent: 0,
  });

  const totalItem = calcTotal(
    quantidade,
    valorUnitMat,
    valorUnitMo,
    ajusteTipo,
    ajusteValor
  );

  await prisma.estimativaItem.create({
    data: {
      usuarioId,
      estimativaId,
      produtoId,
      fornecedorId,
      unidadeId,

      quantidade: quantidade.toFixed(3),
      valorUnitMat: moneyToStr(valorUnitMat, 2),
      valorUnitMo: moneyToStr(valorUnitMo, 2),
      totalItem: moneyToStr(totalItem, 2),

      ajusteTipo,
      ajusteValor: ajusteValor == null ? null : moneyToStr(ajusteValor, 2),

      fontePrecoMat,
      fontePrecoMo,
    },
  });

  const est = await prisma.estimativa.findUnique({
    where: { id: estimativaId },
    select: { projetoId: true },
  });

  const page = est?.projetoId ? `/projetos/${est.projetoId}/itens` : "/projetos";
  revalidatePath(page);
  redirect(`${page}?ok=1`);
}

export async function atualizarItem(formData: FormData) {
  const { id: usuarioId } = await authUser();

  const estimativaId = int(formData.get("estimativaId"));
  const id = int(formData.get("id"));

  const produtoId = int(formData.get("produtoId"));
  const fornecedorId = int(formData.get("fornecedorId"));
  const quantidade = num(formData.get("quantidade"));

  const fontePrecoMat = asFonteMat(formData.get("fontePrecoMat"));
  const fontePrecoMo = asFonteMo(formData.get("fontePrecoMo"));
  const { ajusteTipo, ajusteValor } = parseAjuste(formData.get("ajuste"));

  if (!estimativaId) return backWithError("/projetos", "Estimativa inválida.");
  if (!id) return backWithError("/projetos", "Item inválido.");
  if (!produtoId) return backWithError("/projetos", "Produto inválido.");
  if (!fornecedorId) return backWithError("/projetos", "Fornecedor inválido.");
  if (!quantidade || quantidade <= 0)
    return backWithError("/projetos", "Quantidade inválida.");

  const current = await prisma.estimativaItem.findFirst({
    where: { id, usuarioId, estimativaId },
    select: { valorUnitMat: true, valorUnitMo: true },
  });

  const currentMat = Number(current?.valorUnitMat ?? 0);
  const currentMo = Number(current?.valorUnitMo ?? 0);

  const produto = await prisma.produtoServico.findFirst({
    where: { id: produtoId, usuarioId },
    select: {
      unidadeMedidaId: true,
      refPrecoP1: true,
      refPrecoP2: true,
      refPrecoP3: true,
    },
  });
  if (!produto) return backWithError("/projetos", "Produto não encontrado.");

  const unidadeId = produto.unidadeMedidaId;

  const vinculo = await prisma.fornecedorProduto.findFirst({
    where: { usuarioId, fornecedorId, produtoId },
    select: {
      precoMatP1: true,
      precoMatP2: true,
      precoMatP3: true,
      precoMoM1: true,
      precoMoM2: true,
      precoMoM3: true,
    },
  });

  const valorUnitMat = pickMatPrice({
    fonte: fontePrecoMat,
    vinculo,
    produto,
    fallbackCurrent: currentMat,
  });

  const valorUnitMo = pickMoPrice({
    fonte: fontePrecoMo,
    vinculo,
    fallbackCurrent: currentMo,
  });

  const totalItem = calcTotal(
    quantidade,
    valorUnitMat,
    valorUnitMo,
    ajusteTipo,
    ajusteValor
  );

  await prisma.estimativaItem.updateMany({
    where: { id, usuarioId, estimativaId },
    data: {
      produtoId,
      fornecedorId,
      unidadeId,

      quantidade: quantidade.toFixed(3),

      fontePrecoMat,
      fontePrecoMo,

      valorUnitMat: moneyToStr(valorUnitMat, 2),
      valorUnitMo: moneyToStr(valorUnitMo, 2),

      ajusteTipo,
      ajusteValor: ajusteValor == null ? null : moneyToStr(ajusteValor, 2),

      totalItem: moneyToStr(totalItem, 2),
    },
  });

  const est = await prisma.estimativa.findUnique({
    where: { id: estimativaId },
    select: { projetoId: true },
  });

  const page = est?.projetoId ? `/projetos/${est.projetoId}/itens` : "/projetos";
  revalidatePath(page);
  redirect(`${page}?ok=1`);
}

export async function excluirItem(formData: FormData) {
  const { id: usuarioId } = await authUser();

  const estimativaId = int(formData.get("estimativaId"));
  const id = int(formData.get("id"));
  if (!estimativaId) return backWithError("/projetos", "Estimativa inválida.");
  if (!id) return backWithError("/projetos", "Item inválido.");

  await prisma.estimativaItem.deleteMany({
    where: { id, usuarioId, estimativaId },
  });

  const est = await prisma.estimativa.findUnique({
    where: { id: estimativaId },
    select: { projetoId: true },
  });

  const page = est?.projetoId ? `/projetos/${est.projetoId}/itens` : "/projetos";
  revalidatePath(page);
  redirect(`${page}?ok=1`);
}

export async function aprovarEstimativa(formData: FormData) {
  const { id: usuarioId } = await authUser();
  const estimativaId = int(formData.get("estimativaId"));
  if (!estimativaId) return backWithError("/projetos", "Estimativa inválida.");

  const e = await prisma.estimativa.findFirst({
    where: { id: estimativaId, usuarioId },
    select: { aprovada: true, projetoId: true },
  });
  if (!e) return backWithError("/projetos", "Estimativa não encontrada.");

  await prisma.estimativa.updateMany({
    where: { id: estimativaId, usuarioId },
    data: { aprovada: !e.aprovada },
  });

  const page = `/projetos/${e.projetoId}/estimativas`;
  revalidatePath(page);
  redirect(`${page}?ok=1`);
}
