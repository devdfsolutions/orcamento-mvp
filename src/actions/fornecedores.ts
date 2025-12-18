"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { authUser } from "@/lib/authUser";
import { Prisma } from "@prisma/client";

const PAGE = "/cadastros/fornecedores";

const digits = (v?: FormDataEntryValue | null) =>
  String(v ?? "").replace(/\D+/g, "");

function uniqueDocMessage() {
  return "Já existe fornecedor com este CNPJ/CPF.";
}

/** ✅ Detecta o redirect interno do Next (evita logar como erro) */
function isNextRedirect(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const digest = (err as { digest?: unknown }).digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}

function backWithError(err: unknown): never {
  const msg =
    err instanceof Error
      ? err.message
      : typeof err === "string"
      ? err
      : "Erro inesperado.";

  console.error("[fornecedores action]", err);
  redirect(`${PAGE}?e=${encodeURIComponent(msg)}`);
}

function normalizeDocRequired(raw: FormDataEntryValue | null): string {
  const d = digits(raw);
  if (!d) throw new Error("Informe o CNPJ/CPF do fornecedor.");
  return d;
}

export async function criarFornecedor(formData: FormData) {
  try {
    const { id: usuarioId } = await authUser();

    const nome = String(formData.get("nome") ?? "").trim();
    const cnpjCpf = normalizeDocRequired(formData.get("cnpjCpf"));
    const contato = String(formData.get("contato") ?? "").trim() || null;

    if (!nome) throw new Error("Informe o nome do fornecedor.");

    await prisma.fornecedor.create({
      data: {
        usuarioId,
        nome,
        cnpjCpf,
        contato,
        updatedAt: new Date(), // mantém teu workaround
      },
    });

    revalidatePath(PAGE);
    redirect(`${PAGE}?ok=1`);
  } catch (err) {
    // ✅ se for redirect do Next, deixa passar (não loga como erro)
    if (isNextRedirect(err)) throw err;

    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return backWithError(uniqueDocMessage());
    }
    return backWithError(err);
  }
}

export async function atualizarFornecedor(formData: FormData) {
  try {
    const { id: usuarioId } = await authUser();

    const id = Number(formData.get("id"));
    const nome = String(formData.get("nome") ?? "").trim();
    const cnpjCpf = normalizeDocRequired(formData.get("cnpjCpf"));
    const contato = String(formData.get("contato") ?? "").trim() || null;

    if (!id) throw new Error("ID inválido.");
    if (!nome) throw new Error("Informe o nome do fornecedor.");

    await prisma.fornecedor.updateMany({
      where: { id, usuarioId },
      data: {
        nome,
        cnpjCpf,
        contato,
        updatedAt: new Date(), // mantém coerência
      },
    });

    revalidatePath(PAGE);
    redirect(`${PAGE}?ok=1`);
  } catch (err) {
    if (isNextRedirect(err)) throw err;

    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return backWithError(uniqueDocMessage());
    }
    return backWithError(err);
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
    if (isNextRedirect(err)) throw err;
    return backWithError(err);
  }
}
