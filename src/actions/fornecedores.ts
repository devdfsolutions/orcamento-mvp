'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';

/** Normaliza CNPJ/CPF: mantém só dígitos (ou vazio) */
function onlyDigits(v: FormDataEntryValue | null): string | null {
  if (v == null) return null;
  const s = String(v).replace(/\D+/g, '').trim();
  return s ? s : null;
}

/** CREATE */
export async function criarFornecedor(formData: FormData) {
  const nome = String(formData.get('nome') ?? '').trim();
  if (!nome) throw new Error('Nome é obrigatório.');

  const cnpjCpf = onlyDigits(formData.get('cnpjCpf'));
  const contato = (String(formData.get('contato') ?? '').trim() || null) as string | null;

  await prisma.fornecedor.create({
    data: { nome, cnpjCpf: cnpjCpf ?? '', contato }, // seu schema permite string; se quiser nullable, ajuste no schema
  });

  revalidatePath('/cadastros/fornecedores');
}

/** UPDATE (completo) */
export async function atualizarFornecedor(formData: FormData) {
  const id = Number(formData.get('id'));
  if (!id) throw new Error('ID inválido.');

  const nome = String(formData.get('nome') ?? '').trim();
  if (!nome) throw new Error('Nome é obrigatório.');

  const cnpjCpf = onlyDigits(formData.get('cnpjCpf'));
  const contato = (String(formData.get('contato') ?? '').trim() || null) as string | null;

  await prisma.fornecedor.update({
    where: { id },
    data: { nome, cnpjCpf: cnpjCpf ?? '', contato },
  });

  revalidatePath('/cadastros/fornecedores');
}

/** DELETE */
export async function excluirFornecedor(formData: FormData) {
  const id = Number(formData.get('id'));
  if (!id) throw new Error('ID inválido');

  await prisma.fornecedor.delete({ where: { id } });

  revalidatePath('/cadastros/fornecedores');
}
