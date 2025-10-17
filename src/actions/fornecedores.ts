'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

const PAGE = '/cadastros/fornecedores';

const digits = (s?: FormDataEntryValue | null) => String(s ?? '').replace(/\D+/g, '');

export async function criarFornecedor(formData: FormData) {
  const nome = String(formData.get('nome') ?? '').trim();
  const cnpjCpf = digits(formData.get('cnpjCpf'));
  const contato = (String(formData.get('contato') ?? '').trim() || null) as string | null;

  if (!nome) {
    // mantém UX simples: nada de ?e=...  só volta pra página
    console.error('[fornecedores] nome obrigatório');
    redirect(PAGE);
  }

  await prisma.fornecedor.create({
    data: { nome, cnpjCpf, contato },
  });

  revalidatePath(PAGE);
  redirect(PAGE);
}

export async function atualizarFornecedor(formData: FormData) {
  const id = Number(formData.get('id'));
  const nome = String(formData.get('nome') ?? '').trim();
  const cnpjCpf = digits(formData.get('cnpjCpf'));
  const contato = (String(formData.get('contato') ?? '').trim() || null) as string | null;

  if (!id || !nome) {
    console.error('[fornecedores] id/nome inválidos');
    redirect(PAGE);
  }

  await prisma.fornecedor.update({
    where: { id },
    data: { nome, cnpjCpf, contato },
  });

  revalidatePath(PAGE);
  redirect(PAGE);
}

export async function excluirFornecedor(formData: FormData) {
  const id = Number(formData.get('id'));
  if (!id) {
    console.error('[fornecedores] id inválido para excluir');
    redirect(PAGE);
  }

  await prisma.fornecedor.delete({ where: { id } });

  revalidatePath(PAGE);
  redirect(PAGE);
}
