// actions/unidades.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export async function criarUnidade(formData: FormData) {
  const usuarioId = Number(formData.get("usuarioId"));
  const sigla = String(formData.get("sigla") || "").trim();
  const nome = String(formData.get("nome") || "").trim();

  if (!usuarioId || !sigla || !nome) {
    redirect("/cadastros/unidades?e=" + encodeURIComponent("Preencha todos os campos."));
  }

  await prisma.unidadeMedida.upsert({
    where: { usuarioId_sigla: { usuarioId, sigla } }, // UNIQUE composto
    update: { nome },
    create: { usuarioId, sigla, nome },
  });

  revalidatePath("/cadastros/unidades");
  redirect("/cadastros/unidades?ok=1"); // 👈 volta limpinho e com msg
}
