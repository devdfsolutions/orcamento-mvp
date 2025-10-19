'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { authUser } from '@/lib/authUser';

const PAGE = '/cadastros/fornecedores';

const digits = (s?: FormDataEntryValue | null) => String(s ?? '').replace(/\D+/g, '');

export async function criarFornecedor(formData: FormData) {
  const { id: usuarioId } = await authUser();

  const nome = String(formData.get('nome') ?? '').trim();
  const cnpjCpf = digits(formData.get('cnpjCpf'));
  const contato = (String(formData.get('contato') ?? '').trim() || null) as string | null;

  if (!nome) {
    console.error('[fornecedores] nome obrigatório');
    redirect(PAGE);
  }

  await prisma.fornecedor.create({
    data: { usuarioId, nome, cnpjCpf, contato },
  });

  revalidatePath(PAGE);
  redirect(PAGE);
}

export async function atualizarFornecedor(formData: FormData) {
  const { id: usuarioId } = await authUser();

  const id = Number(formData.get('id'));
  const nome = String(formData.get('nome') ?? '').trim();
  const cnpjCpf = digits(formData.get('cnpjCpf'));
  const contato = (String(formData.get('contato') ?? '').trim() || null) as string | null;

  if (!id || !nome) {
    console.error('[fornecedores] id/nome inválidos');
    redirect(PAGE);
  }

  // protege por usuário
  await prisma.fornecedor.update({
    where: { id, usuarioId },
    data: { nome, cnpjCpf, contato },
  });

  revalidatePath(PAGE);
  redirect(PAGE);
}

export async function excluirFornecedor(formData: FormData) {
  const { id: usuarioId } = await authUser();

  const id = Number(formData.get('id'));
  if (!id) {
    console.error('[fornecedores] id inválido para excluir');
    redirect(PAGE);
  }

  await prisma.fornecedor.delete({
    where: { id, usuarioId },
  });

  revalidatePath(PAGE);
  redirect(PAGE);
}
