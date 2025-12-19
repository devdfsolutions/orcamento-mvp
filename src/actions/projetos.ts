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

/** helper: voltar pra tela de itens do projeto */
function backToItens(projetoId: number, ok?: boolean, msg?: string): never {
  if (!projetoId)
    redirect(`${PAGE}?e=${encodeURIComponent("Projeto inválido.")}`);
  if (msg) redirect(`/projetos/${projetoId}/itens?e=${encodeURIComponent(msg)}`);
  if (ok) redirect(`/projetos/${projetoId}/itens?ok=1`);
  redirect(`/projetos/${projetoId}/itens`);
}

/** Garante que existe ao menos 1 estimativa pro projeto */
async function ensureEstimativa(usuarioId: number, projetoId: number) {
  const existente = await prisma.estimativa.findFirst({
    where: { usuarioId, projetoId },
    select: { id: true },
    orderBy: { id: "desc" },
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
    revalidatePath("/"); // dashboard
    redirect(`/projetos/${projeto.id}/itens`);
  } catch (err) {
    if (isNextRedirect(err)) throw err;
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
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
    revalidatePath("/"); // dashboard
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
    revalidatePath("/"); // dashboard
    redirect(`${PAGE}?ok=1`);
  } catch (err) {
    if (isNextRedirect(err)) throw err;
    backWithError(err);
  }
}

/**
 * ✅ Atualiza status do projeto E sincroniza a "estimativa aprovada"
 * - Se status = "aprovado": marca a ÚLTIMA estimativa do projeto como aprovada=true (e limpa as outras)
 * - Caso contrário: limpa aprovada=false para todas as estimativas do projeto
 */
export async function atualizarStatusProjeto(formData: FormData) {
  try {
    const { id: usuarioId } = await authUser();

    const projetoId = Number(formData.get("projetoId"));
    const status = String(formData.get("status") ?? "").trim();

    if (!projetoId) backToItens(0, false, "Projeto inválido.");

    const allowed = new Set(["aprovado", "desaprovado", "aguardando", "rascunho"]);
    if (!allowed.has(status)) backToItens(projetoId, false, "Status inválido.");

    await prisma.$transaction(async (tx) => {
      // atualiza status do projeto
      await tx.projeto.updateMany({
        where: { id: projetoId, usuarioId },
        data: { status },
      });

      // garante estimativa existente
      const lastEst = await tx.estimativa.findFirst({
        where: { projetoId, usuarioId },
        orderBy: { id: "desc" },
        select: { id: true },
      });

      // se não existe, cria uma
      const estId =
        lastEst?.id ??
        (
          await tx.estimativa.create({
            data: { projetoId, usuarioId, nome: "Estimativa V1" },
            select: { id: true },
          })
        ).id;

      // limpa aprovações antigas
      await tx.estimativa.updateMany({
        where: { projetoId, usuarioId, aprovada: true },
        data: { aprovada: false },
      });

      // se aprovado, aprova a última
      if (status === "aprovado") {
        await tx.estimativa.updateMany({
          where: { id: estId, projetoId, usuarioId },
          data: { aprovada: true },
        });
      }
    });

    // 🔥 revalidar tudo que mostra valor/contadores
    revalidatePath(PAGE);
    revalidatePath("/");
    revalidatePath(`/projetos/${projetoId}/itens`);

    backToItens(projetoId, true);
  } catch (err) {
    if (isNextRedirect(err)) throw err;
    backToItens(
      Number(formData.get("projetoId") ?? 0),
      false,
      "Erro ao atualizar status."
    );
  }
}
