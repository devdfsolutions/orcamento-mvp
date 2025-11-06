"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabaseServer";

const PAGE = "/cadastros/unidades";

function backWithError(err: unknown) {
  const msg =
    (err as any)?.message ??
    (typeof err === "string" ? err : "Erro inesperado ao salvar.");
  console.error("[unidades action]", err);
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

export async function criarUnidade(formData: FormData) {
  try {
    const usuarioId = await meId();

    let sigla = String(formData.get("sigla") || "").trim();
    const nome = String(formData.get("nome") || "").trim();

    if (!sigla) throw new Error("Informe a sigla.");
    if (!nome) throw new Error("Informe o nome da unidade.");

    sigla = sigla.toUpperCase();

    await prisma.unidadeMedida.upsert({
      where: { usuarioId_sigla: { usuarioId, sigla } }, // UNIQUE composto
      update: { nome },
      create: {
