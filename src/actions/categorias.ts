"use server";

import { prisma } from "@/lib/prisma";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";

function normNome(v: string) {
  return v.trim();
}

async function getUsuarioIdOrRedirect(): Promise<number> {
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

export async function criarCategoria(formData: FormData) {
  const usuarioId = await getUsuarioIdOrRedirect();

  const nome = normNome(String(formData.get("nome") ?? ""));
  if (!nome) {
    redirect(
      "/cadastros/categorias?e=" + encodeURIComponent("Preencha o nome.")
    );
  }

  try {
    const now = new Date();

    await prisma.categoria.upsert({
      where: { usuarioId_nome: { usuarioId, nome } },
      update: { updatedAt: now },
      create: {
        usuarioId,
        nome,
        updatedAt: now,
      },
    });

    redirect("/cadastros/categorias?ok=1");
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Erro ao salvar categoria.";
    redirect("/cadastros/categorias?e=" + encodeURIComponent(msg));
  }
}

export async function excluirCategoria(formData: FormData) {
  const usuarioId = await getUsuarioIdOrRedirect();
  const id = Number(formData.get("id"));

  if (!id || Number.isNaN(id)) {
    redirect("/cadastros/categorias?e=" + encodeURIComponent("ID inválido."));
  }

  try {
    await prisma.categoria.delete({
      where: { id, usuarioId },
    });

    redirect("/cadastros/categorias?ok=1");
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Erro ao excluir categoria.";
    redirect("/cadastros/categorias?e=" + encodeURIComponent(msg));
  }
}
