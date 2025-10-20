'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSupabaseServer } from '@/lib/supabaseServer';

const PAGE = '/cadastros/vinculos';

/* Helpers numéricos/datas */
function parseMoney(v: FormDataEntryValue | null): number | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}
function r2(n: number | null): number | undefined {
  if (n == null) return undefined;
  return Math.round(n * 100) / 100;
}
function parseDateISO(v: FormDataEntryValue | null): Date {
  const s = String(v ?? '').trim();
  if (!s) return new Date();
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) {
    const [_, dd, mm, yyyy] = m;
    return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? new Date() : d;
}

/** Descobre o meu usuarioId a partir do Supabase */
async function getMeuUsuarioId(): Promise<number> {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Sessão expirada. Faça login novamente.');
  const me = await prisma.usuario.findUnique({
    where: { supabaseUserId: user.id },
    select: { id: true },
  });
  if (!me) throw new Error('Usuário não encontrado.');
  return me.id;
}

/** UPSERT (Cria ou Atualiza) */
export async function upsertVinculo(formData: FormData) {
  try {
    const usuarioId = await getMeuUsuarioId();

    const fornecedorId = Number(formData.get('fornecedorId'));
    const produtoId    = Number(formData.get('produtoId'));
    if (!Number.isFinite(fornecedorId) || !Number.isFinite(produtoId)) {
      throw new Error('Fornecedor e Produto são obrigatórios.');
    }

    // garante que fornecedor e produto pertencem ao mesmo usuário
    const [forn, prod] = await Promise.all([
      prisma.fornecedor.findUnique({ where: { id: fornecedorId }, select: { usuarioId: true } }),
      prisma.produtoServico.findUnique({ where: { id: produtoId }, select: { usuarioId: true } }),
    ]);
    if (!forn || forn.usuarioId !== usuarioId) throw new Error('Fornecedor inválido.');
    if (!prod || prod.usuarioId !== usuarioId) throw new Error('Produto/serviço inválido.');

    const precoMatP1 = r2(parseMoney(formData.get('precoMatP1')));
    const precoMatP2 = r2(parseMoney(formData.get('precoMatP2')));
    const precoMatP3 = r2(parseMoney(formData.get('precoMatP3')));
    const precoMoM1  = r2(parseMoney(formData.get('precoMoM1')));
    const precoMoM2  = r2(parseMoney(formData.get('precoMoM2')));
    const precoMoM3  = r2(parseMoney(formData.get('precoMoM3')));

    const dataUltAtual = parseDateISO(formData.get('dataUltAtual'));
    const observacao   = (String(formData.get('observacao') ?? '').trim() || null) as string | null;

    const now = new Date();

    await prisma.fornecedorProduto.upsert({
      // 👉 usa a chave única correta
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
    redirect(PAGE);
  } catch (err) {
    console.error('[vinculos upsert]', err);
    // devolve mensagem via query param (mantém padrão das outras telas)
    const msg =
      (err as any)?.message ?? 'Erro ao salvar vínculo.';
    redirect(`${PAGE}?e=${encodeURIComponent(msg)}`);
  }
}

/** EXCLUIR VÍNCULO */
export async function excluirVinculo(formData: FormData) {
  try {
    const usuarioId = await getMeuUsuarioId();
    const id = Number(formData.get('id'));
    if (!Number.isFinite(id)) throw new Error('ID inválido');

    // segurança: só apaga se o vínculo é meu
    await prisma.fornecedorProduto.delete({
      where: { id, usuarioId },
    });

    revalidatePath(PAGE);
    redirect(PAGE);
  } catch (err) {
    console.error('[vinculos delete]', err);
    const msg =
      (err as any)?.message ?? 'Erro ao excluir vínculo.';
    redirect(`${PAGE}?e=${encodeURIComponent(msg)}`);
  }
}
