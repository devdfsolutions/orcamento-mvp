'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';

const PAGE = '/cadastros/vinculos';

/* Helpers */
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

/** UPSERT (Cria ou Atualiza) */
export async function upsertVinculo(formData: FormData) {
  try {
    const fornecedorId = Number(formData.get('fornecedorId'));
    const produtoId = Number(formData.get('produtoId'));
    if (!fornecedorId || !produtoId)
      throw new Error('Fornecedor e Produto são obrigatórios.');

    const precoMatP1 = r2(parseMoney(formData.get('precoMatP1')));
    const precoMatP2 = r2(parseMoney(formData.get('precoMatP2')));
    const precoMatP3 = r2(parseMoney(formData.get('precoMatP3')));
    const precoMoM1 = r2(parseMoney(formData.get('precoMoM1')));
    const precoMoM2 = r2(parseMoney(formData.get('precoMoM2')));
    const precoMoM3 = r2(parseMoney(formData.get('precoMoM3')));

    const dataUltAtual = parseDateISO(formData.get('dataUltAtual'));
    const observacao =
      (String(formData.get('observacao') ?? '').trim() || null) as string | null;

    const now = new Date();

    await prisma.fornecedorProduto.upsert({
      where: { fornecedorId_produtoId: { fornecedorId, produtoId } },
      create: {
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
      } as any,
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
      } as any,
    });

    revalidatePath(PAGE);
    return { ok: true };
  } catch (err) {
    console.error('[vinculos action]', err);
    return { ok: false, message: (err as any)?.message ?? 'Erro ao salvar.' };
  }
}

/** EXCLUIR VÍNCULO */
export async function excluirVinculo(formData: FormData) {
  try {
    const id = Number(formData.get('id'));
    if (!id) throw new Error('ID inválido');

    await prisma.fornecedorProduto.delete({ where: { id } });
    revalidatePath(PAGE);
    return { ok: true };
  } catch (err) {
    console.error('[vinculos delete]', err);
    return { ok: false, message: (err as any)?.message ?? 'Erro ao excluir.' };
  }
}
