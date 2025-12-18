"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { authUser } from "@/lib/authUser";
import { Prisma } from "@prisma/client";

const PAGE = "/projetos";

/** ✅ Detecta redirect interno do Next pra não “logar erro” */
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
  redirect(`${PAGE}?e=${encodeURIComponent(msg)}`);
}

/** Garante que existe ao menos 1 estimativa pro projeto */
async function ensureEstimativa(usuarioId: number, projetoId: number) {
  const existente = await prisma.estimativa.findFirst({
    where: { usuarioId, projetoId },
    select: { id: true },
  });
  if (existente) return existente.id;

  const novo = await prisma.estimativa.create({
    data: {
      usuarioId,
      projetoId,
      nome: "Estimativa V1",
    },
    select: { id: true },
  });
  return novo.id;
}

/** Criar projeto e ir direto pros itens */
export async function criarProjetoAndGo(formData: FormData) {
  try {
    const { id: usuarioId } = await authUser();

    const nome = String(formData.get("nome") ?? "").trim();
    const clienteIdRaw = String(formData.get("clienteId") ?? "").trim();
    const clienteId = clienteIdRaw ? Number(clienteIdRaw) : null;

    if (!nome) throw new Error("Nome do projeto é obrigatório.");

    // se cliente veio, valida que é do usuário
    if (clienteId) {
      const cli = await prisma.clienteUsuario.findFirst({
        where: { id: clienteId, usuarioId },
        select: { id: true },
      });
      if (!cli) throw new Error("Cliente inválido para este usuário.");
    }

    const projeto = await prisma.projeto.create({
      data: {
        usuarioId,
        nome,
        status: "rascunho",
        ...(clienteId ? { clienteId } : {}),
      },
      select: { id: true },
    });

    await ensureEstimativa(usuarioId, projeto.id);

    revalidatePath(PAGE);
    redirect(`/projetos/${projeto.id}/itens`);
  } catch (err) {
    if (isNextRedirect(err)) throw err;
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      backWithError("Já existe um projeto com este identificador.");
    }
    backWithError(err);
  }
}

/** Atualizar projeto (nome/status/cliente) */
export async function atualizarProjeto(formData: FormData) {
  try {
    const { id: usuarioId } = await authUser();

    const id = Number(formData.get("id"));
    const nome = String(formData.get("nome") ?? "").trim();
    const status = String(formData.get("status") ?? "").trim();

    const clienteIdRaw = String(formData.get("clienteId") ?? "").trim();
    const clienteId = clienteIdRaw ? Number(clienteIdRaw) : null;

    if (!id) throw new Error("ID inválido.");
    if (!nome) throw new Error("Nome é obrigatório.");

    // valida cliente (se veio)
    if (clienteId) {
      const cli = await prisma.clienteUsuario.findFirst({
        where: { id: clienteId, usuarioId },
        select: { id: true },
      });
      if (!cli) throw new Error("Cliente inválido para este usuário.");
    }

    await prisma.projeto.updateMany({
      where: { id, usuarioId },
      data: {
        nome,
        status,
        clienteId: clienteId ?? null,
      },
    });

    revalidatePath(PAGE);
    redirect(`${PAGE}?ok=1`);
  } catch (err) {
    if (isNextRedirect(err)) throw err;
    backWithError(err);
  }
}

/** Excluir projeto */
export async function excluirProjeto(formData: FormData) {
  try {
    const { id: usuarioId } = await authUser();
    const id = Number(formData.get("id"));
    if (!id) throw new Error("ID inválido para excluir.");

    await prisma.projeto.deleteMany({ where: { id, usuarioId } });

    revalidatePath(PAGE);
    redirect(`${PAGE}?ok=1`);
  } catch (err) {
    if (isNextRedirect(err)) throw err;
    backWithError(err);
  }
}
