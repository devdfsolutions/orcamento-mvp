'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSupabaseServer } from '@/lib/supabaseServer';

const PAGE = '/cadastros/produtos';

async function getMeId() {
  const sb = await getSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect('/login');

  const me = await prisma.usuario.findUnique({
    where: { supabaseUserId: user.id },
    select: { id: true },
  });
  if (!me) redirect('/login');
  return me.id;
}

export async function criarProdutoServico(formData: FormData) {
  const meId = await getMeId();

  const nome = String(formData.get('nome') ?? '').trim();
  const tipo = String(formData.get('tipo') ?? 'AMBOS').trim() as 'PRODUTO' | 'SERVICO' | 'AMBOS';
  const unidadeMedidaId = Number(formData.get('unidadeMedidaId'));
  const categoria = (String(formData.get('categoria') ?? '').trim() || null) as string | null;

  if (!nome || !unidadeMedidaId) {
    redirect(`${PAGE}?e=${encodeURIComponent('Informe nome e unidade.')}`);
  }

  await prisma.produtoServico.create({
    data: {
      usuarioId: meId,
      nome,
      categoria,
      unidadeMedidaId,
      tipo: tipo as any,
    },
  });

  revalidatePath(PAGE);
  redirect(PAGE);
}

export async function atualizarProdutoServico(formData: FormData) {
  const meId = await getMeId();

  const id = Number(formData.get('id'));
  const nome = String(formData.get('nome') ?? '').trim();
  const tipo = String(formData.get('tipo') ?? 'AMBOS').trim() as 'PRODUTO' | 'SERVICO' | 'AMBOS';
  const unidadeMedidaId = Number(formData.get('unidadeMedidaId'));
  const categoria = (String(formData.get('categoria') ?? '').trim() || null) as string | null;

  if (!id || !nome || !unidadeMedidaId) {
    redirect(`${PAGE}?e=${encodeURIComponent('Dados inválidos.')}`);
  }

  await prisma.produtoServico.update({
    where: { id, /* segurança extra */ usuarioId: meId },
    data: { nome, categoria, unidadeMedidaId, tipo: tipo as any },
  });

  revalidatePath(PAGE);
  redirect(PAGE);
}

export async function excluirProdutoServico(formData: FormData) {
  const meId = await getMeId();

  const id = Number(formData.get('id'));
  if (!id) redirect(`${PAGE}?e=${encodeURIComponent('Produto inválido.')}`);

  await prisma.produtoServico.delete({
    where: { id, usuarioId: meId },
  });

  revalidatePath(PAGE);
  redirect(PAGE);
}
