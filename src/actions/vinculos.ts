"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSupabaseServer } from "@/lib/supabaseServer";

const PAGE = "/cadastros/vinculos";

/* ===================== */
/* ===== Helpers ======= */
/* ===================== */

function parseMoney(v: FormDataEntryValue | null): number | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function r2(n: number | null): number | undefined {
  if (n == null) return undefined;
  return Math.round(n * 100) / 100;
}

function parseDateISO(v: FormDataEntryValue | null): Date {
  const s = String(v ?? "").trim();
  if (!s) return new Date();
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) {
    const [, dd, mm, yyyy] = m;
    return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? new Date() : d;
}

/** detecta o erro interno do Next quando você chama redirect() */
function isNextRedirectError(e: unknown): e is { digest: string } {
  if (typeof e !== "object" || e === null) return false;
  if (!("digest" in e)) return false;
  const digest = (e as { digest?: unknown }).digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}

/** Obtém o ID do usuário logado no Supabase (relacionado com o modelo Usuario) */
async function getMeuUsuarioId(): Promise<number> {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sessão expirada. Faça login novamente.");

  const me = await prisma.usuario.findUnique({
    where: { supabaseUserId: user.id },
    select: { id: true },
  });
  if (!me) throw new Error("Usuário não encontrado.");
  return me.id;
}

/* ============================== */
/* ====== AÇÕES PRINCIPAIS ====== */
/* ============================== */

/**
 * Cria ou atualiza vínculo fornecedor-produto.
 * Usa upsert com base em (usuarioId, fornecedorId, produtoId).
 */
export async function upsertVinculo(formData: FormData) {
  try {
    const usuarioId = await getMeuUsuarioId();

    const fornecedorId = Number(formData.get("fornecedorId"));
    const produtoId = Number(formData.get("produtoId"));
    if (!fornecedorId || !produtoId) {
      throw new Error("Fornecedor e Produto são obrigatórios.");
    }

    // Confere se fornecedor e produto pertencem ao mesmo usuário
    const [forn, prod] = await Promise.all([
      prisma.fornecedor.findFirst({
        where: { id: fornecedorId, usuarioId },
        select: { id: true },
      }),
      prisma.produtoServico.findFirst({
        where: { id: produtoId, usuarioId },
        select: { id: true },
      }),
    ]);

    if (!forn) throw new Error("Fornecedor inválido.");
    if (!prod) throw new Error("Produto inválido.");

    const precoMatP1 = r2(parseMoney(formData.get("precoMatP1")));
    const precoMatP2 = r2(parseMoney(formData.get("precoMatP2")));
    const precoMatP3 = r2(parseMoney(formData.get("precoMatP3")));
    const precoMoM1 = r2(parseMoney(formData.get("precoMoM1")));
    const precoMoM2 = r2(parseMoney(formData.get("precoMoM2")));
    const precoMoM3 = r2(parseMoney(formData.get("precoMoM3")));

    const dataUltAtual = parseDateISO(formData.get("dataUltAtual"));
    const observacao =
      (String(formData.get("observacao") ?? "").trim() || null) as string | null;

    const now = new Date();

    await prisma.fornecedorProduto.upsert({
      where: {
        usuarioId_fornecedorId_produtoId: {
          usuarioId,
          fornecedorId,
          produtoId,
        },
      },
      create: {
        usuarioId,
        fornecedorId,
        produtoId,
        precoMatP1,
        precoMatP2,
        precoMatP3,
        precoMoM1,
        precoMoM2,
        precoMoM3,
        dataUltAtual,
        observacao,
        createdAt: now,
        updatedAt: now,
      },
      update: {
        precoMatP1,
        precoMatP2,
        precoMatP3,
        precoMoM1,
        precoMoM2,
        precoMoM3,
        dataUltAtual,
        observacao,
        updatedAt: now,
      },
    });

    revalidatePath(PAGE);
    redirect(`${PAGE}?ok=1`);
  } catch (err) {
    // ✅ se for redirect do Next, não trata como erro
    if (isNextRedirectError(err)) throw err;

    console.error("[vinculos upsert]", err);
    const msg = err instanceof Error ? err.message : "Erro ao salvar vínculo.";
    redirect(`${PAGE}?e=${encodeURIComponent(msg)}`);
  }
}

/**
 * Exclui vínculo, validando que o registro pertence ao usuário logado.
 */
export async function excluirVinculo(formData: FormData) {
  try {
    const usuarioId = await getMeuUsuarioId();
    const id = Number(formData.get("id"));
    if (!id) throw new Error("ID inválido.");

    await prisma.fornecedorProduto.deleteMany({
      where: { id, usuarioId },
    });

    revalidatePath(PAGE);
    redirect(`${PAGE}?ok=1`);
  } catch (err) {
    // ✅ se for redirect do Next, não trata como erro
    if (isNextRedirectError(err)) throw err;

    console.error("[vinculos delete]", err);
    const msg = err instanceof Error ? err.message : "Erro ao excluir vínculo.";
    redirect(`${PAGE}?e=${encodeURIComponent(msg)}`);
  }
}
