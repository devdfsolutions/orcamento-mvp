"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabaseServer";

const PAGE = "/cadastros/produtos";

function backWithError(err: unknown) {
  const msg =
    (err as any)?.message ??
    (typeof err === "string" ? err : "Erro inesperado ao salvar.");
  console.error("[produtos action]", err);
  redirect(`${PAGE}?e=${encodeURIComponent(msg)}`);
}

async function meId() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const me = await prisma.usuario.findUnique({
    where: { supabaseUserId: user.id },
    select: { id: true },
  });
  if (!me) redirect("/login");
  return me.id;
}

export async function criarProduto(formData: FormData) {
  try {
    const usuarioId = await meId();
    const nome = String(formData.get("nome") || "").trim();
    const tipo = String(formData.get("tipo") || "AMBOS") as
      | "PRODUTO" | "SERVICO" | "AMBOS";
    const unidadeMedidaId = Number(formData.get("unidadeMedidaId"));
    const categoria = String(formData.get("categoria") || "").trim() || null;

    if (!nome) throw new Error("Informe o nome.");
    if (!unidadeMedidaId) throw new Error("Selecione a unidade de medida.");

    await prisma.produtoServico.create({
      data: { usuarioId, nome, tipo, unidadeMedidaId, categoria },
    });

    revalidatePath(PAGE);
    redirect(`${PAGE}?ok=1`);
  } catch (err) {
    backWithError(err);
  }
}

export async function atualizarProduto(formData: FormData) {
  try {
    const usuarioId = await meId();
    const id = Number(formData.get("id"));
    const nome = String(formData.get("nome") || "").trim();
    const tipo = String(formData.get("tipo") || "AMBOS") as
      | "PRODUTO" | "SERVICO" | "AMBOS";
    const unidadeMedidaId = Number(formData.get("unidadeMedidaId"));
    const categoria = String(formData.get("categoria") || "").trim() || null;

    if (!id) throw new Error("ID inválido.");
    if (!nome) throw new Error("Informe o nome.");
    if (!unidadeMedidaId) throw new Error("Selecione a unidade de medida.");

    // garante escopo
    await prisma.produtoServico.updateMany({
      where: { id, usuarioId },
      data: { nome, tipo, unidadeMedidaId, categoria },
    });

    revalidatePath(PAGE);
    redirect(`${PAGE}?ok=1`);
  } catch (err) {
    backWithError(err);
  }
}

export async function excluirProduto(formData: FormData) {
  try {
    const usuarioId = await meId();
    const id = Number(formData.get("id"));
    if (!id) throw new Error("ID inválido.");

    await prisma.produtoServico.deleteMany({
      where: { id, usuarioId },
    });

    revalidatePath(PAGE);
    redirect(`${PAGE}?ok=1`);
  } catch (err) {
    backWithError(err);
  }
}
