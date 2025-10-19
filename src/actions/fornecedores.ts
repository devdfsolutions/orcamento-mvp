'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { authUser } from '@/lib/authUser';

const PAGE = '/cadastros/fornecedores';

// mantém só dígitos
const digits = (s?: FormDataEntryValue | null) => String(s ?? '').replace(/\D+/g, '');

/** Criar fornecedor (escopo do usuário) */
export async function criarFornecedor(formData: FormData) {
  const { me } = await authUser(); // lança se não logado

  const nome = String(formData.get('nome') ?? '').trim();
  const cnpjCpf = digits(formData.get('cnpjCpf'));
  const contato = (String(formData.get('contato') ?? '').trim() || null) as string | null;

  if (!nome) {
    console.error('[fornecedores] nome obrigatório');
    redirect(PAGE);
  }

  await prisma.fornecedor.create({
    data: {
      usuarioId: me.id,
      nome,
      // ATENÇÃO: no seu schema atual cnpjCpf é NOT NULL + unique por usuário.
      // Se quiser permitir deixar vazio e cadastrar vários sem doc,
      // torne o campo opcional no Prisma (String?) e rode migration.
      cnpjCpf: cnpjCpf || '',
      contato,
    },
  });

  revalidatePath(PAGE);
  redirect(PAGE);
}

/** Atualizar fornecedor (só do usuário corrente) */
export async function atualizarFornecedor(formData: FormData) {
  const { me } = await authUser();

  const id = Number(formData.get('id'));
  const nome = String(formData.get('nome') ?? '').trim();
  const cnpjCpf = digits(formData.get('cnpjCpf'));
  const contato = (String(formData.get('contato') ?? '').trim() || null) as string | null;

  if (!id || !nome) {
    console.error('[fornecedores] id/nome inválidos');
    redirect(PAGE);
  }

  // where inclui usuarioId para não permitir editar de outro usuário
  await prisma.fornecedor.update({
    where: { id_usuarioId: { id, usuarioId: me.id } }, // <- precisa do índice composto
    data: { nome, cnpjCpf: cnpjCpf || '', contato },
  });

  revalidatePath(PAGE);
  redirect(PAGE);
}

/** Excluir fornecedor (só do usuário corrente) */
export async function excluirFornecedor(formData: FormData) {
  const { me } = await authUser();

  const id = Number(formData.get('id'));
  if (!id) {
    console.error('[fornecedores] id inválido para excluir');
    redirect(PAGE);
  }

  await prisma.fornecedor.delete({
    where: { id_usuarioId: { id, usuarioId: me.id } },
  });

  revalidatePath(PAGE);
  redirect(PAGE);
}
