"use server";

import { prisma } from "@/lib/prisma";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function toInt(v: FormDataEntryValue | null) {
  const n = Number(v ?? "");
  return Number.isFinite(n) ? n : NaN;
}

function normStr(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return s.length ? s : "";
}

async function requireMe() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const me = await prisma.usuario.findUnique({
    where: { supabaseUserId: user.id },
    select: { id: true },
  });
  if (!me) redirect("/login");

  return me.id;
}

async function getOrCreateCategoria(usuarioId: number, nomeRaw: string) {
  const nome = (nomeRaw || "").trim() || "Geral";

  const existing = await prisma.categoria.findFirst({
    where: { usuarioId, nome },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await prisma.categoria.create({
    data: {
      usuarioId,
      nome,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    select: { id: true },
  });

  return created.id;
}

/** CREATE (pode redirect pq vem do form do Server Component) */
export async function criarProduto(formData: FormData) {
  const usuarioId = await requireMe();

  const nome = normStr(formData.get("nome"));
  const tipo = normStr(formData.get("tipo")) as "PRODUTO" | "SERVICO" | "AMBOS";
  const unidadeMedidaId = toInt(formData.get("unidadeMedidaId"));

  // ✅ suportar os 2 jeitos: select (categoriaId) e legado (categoria texto)
  const categoriaIdFromSelect = toInt(formData.get("categoriaId"));
  const categoriaNomeLegacy = normStr(formData.get("categoria"));

  if (!nome) redirect("/cadastros/produtos?e=" + encodeURIComponent("Preencha o nome."));
  if (!["PRODUTO", "SERVICO", "AMBOS"].includes(tipo))
    redirect("/cadastros/produtos?e=" + encodeURIComponent("Tipo inválido."));
  if (!Number.isFinite(unidadeMedidaId))
    redirect("/cadastros/produtos?e=" + encodeURIComponent("Selecione a unidade de medida."));

  try {
    // ✅ categoriaId é obrigatório => sempre resolve um number
    const categoriaId = Number.isFinite(categoriaIdFromSelect)
      ? categoriaIdFromSelect
      : await getOrCreateCategoria(usuarioId, categoriaNomeLegacy || "Geral");

    await prisma.produtoServico.create({
      data: {
        usuarioId,
        nome,
        tipo,
        unidadeMedidaId,
        categoriaId, // ✅ sempre number
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    revalidatePath("/cadastros/produtos");
    redirect("/cadastros/produtos?ok=1");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao criar produto/serviço.";
    redirect("/cadastros/produtos?e=" + encodeURIComponent(msg));
  }
}

/** UPDATE (NÃO pode redirect — é chamado pelo Client) */
export async function atualizarProduto(formData: FormData) {
  const usuarioId = await requireMe();

  const id = toInt(formData.get("id"));
  const nome = normStr(formData.get("nome"));
  const tipo = normStr(formData.get("tipo")) as "PRODUTO" | "SERVICO" | "AMBOS";
  const unidadeMedidaId = toInt(formData.get("unidadeMedidaId"));

  const categoriaIdFromSelect = toInt(formData.get("categoriaId"));
  const categoriaNomeLegacy = normStr(formData.get("categoria"));

  if (!Number.isFinite(id)) throw new Error("ID inválido.");
  if (!nome) throw new Error("Preencha o nome.");
  if (!["PRODUTO", "SERVICO", "AMBOS"].includes(tipo)) throw new Error("Tipo inválido.");
  if (!Number.isFinite(unidadeMedidaId)) throw new Error("Selecione a unidade de medida.");

  // garante que é do usuário
  const exists = await prisma.produtoServico.findFirst({
    where: { id, usuarioId },
    select: { id: true },
  });
  if (!exists) throw new Error("Produto/serviço não encontrado.");

  // ✅ categoriaId obrigatório => sempre resolve um number
  const categoriaId = Number.isFinite(categoriaIdFromSelect)
    ? categoriaIdFromSelect
    : await getOrCreateCategoria(usuarioId, categoriaNomeLegacy || "Geral");

  await prisma.produtoServico.update({
    where: { id },
    data: {
      nome,
      tipo,
      unidadeMedidaId,
      categoriaId, // ✅ sempre number
      updatedAt: new Date(),
    },
  });

  revalidatePath("/cadastros/produtos");
}

/** DELETE (NÃO pode redirect — é chamado pelo Client) */
export async function excluirProduto(formData: FormData) {
  const usuarioId = await requireMe();

  const id = toInt(formData.get("id"));
  if (!Number.isFinite(id)) throw new Error("ID inválido.");

  await prisma.produtoServico.deleteMany({
    where: { id, usuarioId },
  });

  revalidatePath("/cadastros/produtos");
}
