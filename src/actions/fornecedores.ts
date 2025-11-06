"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { authUser } from "@/lib/authUser";

const PAGE = "/cadastros/fornecedores";

const digits = (s?: FormDataEntryValue | null) =>
  String(s ?? "").replace(/\D+/g, "");

function backWithError(err: unknown) {
  const msg =
    (err as any)?.message ??
    (typeof err === "string" ? err : "Erro inesperado.");
  console.error("[fornecedores action]", err);
  redirect(`${PAGE}?e=${encodeURIComponent(msg)}`);
}

export async function criarFornecedor(formData: FormData) {
  try {
    const { id: usuarioId } = await authUser();

    const nome = String(formData.get("nome") ?? "").trim();
    const cnpjCpf = digits(formData.get("cnpjCpf"));
    const contato = (String(formData.get("contato") ?? "").trim() || null) as
      | string
      | null;

    if (!nome) throw new Error("Informe o nome do fornecedor.");

    await prisma.fornecedor.create({
      data: { usuarioId, nome, cnpjCpf, contato },
    });

    revalidatePath(PAGE);
    redirect(`${PAGE}?ok=1`);
  } catch (err) {
    backWithError(err);
  }
}

export async function atualizarFornecedor(formData: FormData) {
  try {
    const { id: usuarioId } = await authUser();

    const id = Number(formData.get("id"));
    const nome = String(formData.get("nome") ?? "").trim();
    const cnpjCpf = digits(formData.get("cnpjCpf"));
    const contato = (String(formData.get("contato") ?? "").trim() || null) as
      | string
      | null;

    if (!id) throw new Error("ID inválido.");
    if (!nome) throw new Error("Informe o nome do fornecedor.");

    // protege por usuário (não depende de unique composto)
    await prisma.fornecedor.updateMany({
      where: { id, usuarioId },
      data: { nome, cnpjCpf, contato },
    });

    revalidatePath(PAGE);
    redirect(`${PAGE}?ok=1`);
  } catch (err) {
    backWithError(err);
  }
}

export async function excluirFornecedor(formData: FormData) {
  try {
    const { id: usuarioId } = await authUser();

    const id = Number(formData.get("id"));
    if (!id) throw new Error("ID inválido para excluir.");

    await prisma.fornecedor.deleteMany({
      where: { id, usuarioId },
    });

    revalidatePath(PAGE);
    redirect(`${PAGE}?ok=1`);
  } catch (err) {
    backWithError(err);
  }
}
