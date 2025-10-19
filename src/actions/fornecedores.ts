'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { authUser } from '@/lib/authUser';

const PAGE = '/cadastros/fornecedores';

const digits = (s?: FormDataEntryValue | null) => String(s ?? '').replace(/\D+/g, '');

async function requireMeId() {
  const { me } = await authUser();
  if (!me) redirect('/login');
  return me.id;
}

export async function criarFornecedor(formData: FormData) {
  const meId = await requireMeId();

  const nome = String(formData.get('nome') ?? '').trim();
  const cnpjCpf = digits(formData.get('cnpjCpf'));
  const contato = (String(formData.get('contato') ?? '').trim() || null) as string | null;

  if (!nome) {
    console.error('[fornecedores] nome obrigatório');
    redirect(PAGE);
  }

  await prisma.fornecedor.create({
    data: { usuarioId: meId, nome, cnpjCpf, contato },
  });

  revalidatePath(PAGE);
  redirect(PAGE);
}

export async function atualizarFornecedor(formData: FormData) {
  const meId = await requireMeId();

  const id = Number(formData.get('id'));
  const nome = String(formData.get('nome') ?? '').trim();
  const cnpjCpf = digits(formData.get('cnpjCpf'));
  const contato = (String(formData.get('contato') ?? '').trim() || null) as string | null;

  if (!id || !nome) {
    console.error('[fornecedores] id/nome inválidos');
    redirect(PAGE);
  }

  const { count } = await prisma.fornecedor.updateMany({
    where: { id, usuarioId: meId },
    data: { nome, cnpjCpf, contato },
  });

  if (count === 0) {
    console.warn('[fornecedores] update ignorado (não pertence ao usuário ou não existe)');
  }

  revalidatePath(PAGE);
  redirect(PAGE);
}

export async function excluirFornecedor(formData: FormData) {
  const meId = await requireMeId();
  const id = Number(formData.get('id'));
  if (!id) {
    console.error('[fornecedores] id inválido para excluir');
    redirect(PAGE);
  }

  await prisma.fornecedor.deleteMany({ where: { id, usuarioId: meId } });

  revalidatePath(PAGE);
  redirect(PAGE);
}
