'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

const PAGE = '/cadastros/fornecedores';

function onlyDigits(s: string) {
  return s.replace(/\D+/g, '');
}
function isCpf(d: string) { return d.length === 11; }
function isCnpj(d: string) { return d.length === 14; }

function backWithError(err: unknown) {
  const msg =
    (err as any)?.message ??
    (typeof err === 'string' ? err : 'Erro inesperado ao salvar.');
  console.error('[fornecedores action]', err);
  redirect(`${PAGE}?e=${encodeURIComponent(msg)}`);
}

/** CREATE */
export async function criarFornecedor(formData: FormData) {
  try {
    const nome = String(formData.get('nome') ?? '').trim();
    if (!nome) throw new Error('Nome é obrigatório.');

    const rawDoc = String(formData.get('cnpjCpf') ?? '');
    const d = onlyDigits(rawDoc);
    if (!d) throw new Error('Informe CNPJ/CPF (apenas números).');
    if (!isCpf(d) && !isCnpj(d)) throw new Error('CNPJ/CPF inválido.');

    const contato = (String(formData.get('contato') ?? '').trim() || null) as string | null;

    await prisma.fornecedor.create({
      data: { nome, cnpjCpf: d, contato },
    });

    revalidatePath(PAGE);
    redirect(`${PAGE}?ok=1`);
  } catch (err) {
    backWithError(err);
  }
}

/** UPDATE */
export async function atualizarFornecedor(formData: FormData) {
  try {
    const id = Number(formData.get('id'));
    if (!Number.isFinite(id)) throw new Error('ID inválido.');

    const nome = String(formData.get('nome') ?? '').trim();
    if (!nome) throw new Error('Nome é obrigatório.');

    const rawDoc = String(formData.get('cnpjCpf') ?? '');
    const d = onlyDigits(rawDoc);
    if (!d) throw new Error('Informe CNPJ/CPF.');
    if (!isCpf(d) && !isCnpj(d)) throw new Error('CNPJ/CPF inválido.');

    const contato = (String(formData.get('contato') ?? '').trim() || null) as string | null;

    await prisma.fornecedor.update({
      where: { id },
      data: { nome, cnpjCpf: d, contato },
    });

    revalidatePath(PAGE);
    redirect(`${PAGE}?ok=1`);
  } catch (err) {
    backWithError(err);
  }
}

/** DELETE */
export async function excluirFornecedor(formData: FormData) {
  try {
    const id = Number(formData.get('id'));
    if (!Number.isFinite(id)) throw new Error('ID inválido.');

    await prisma.fornecedor.delete({ where: { id } });

    revalidatePath(PAGE);
    redirect(`${PAGE}?ok=1`);
  } catch (err) {
    backWithError(err);
  }
}
