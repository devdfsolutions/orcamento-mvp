'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabaseServer';

async function meId() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const me = await prisma.usuario.findUnique({
    where: { supabaseUserId: user.id },
    select: { id: true },
  });
  if (!me) redirect('/login');
  return me.id;
}

/** Atualizar nome/status/cliente (scoped por usuário) */
export async function atualizarProjeto(formData: FormData) {
  const usuarioId = await meId();

  const id = Number(formData.get('id'));
  const nome = String(formData.get('nome') ?? '').trim();
  const status = String(formData.get('status') ?? '').trim();
  const clienteIdRaw = String(formData.get('clienteId') ?? '').trim();
  const clienteId = clienteIdRaw ? Number(clienteIdRaw) : null;

  if (!id || !nome) throw new Error('Dados inválidos');

  await prisma.projeto.updateMany({
    where: { id, usuarioId },
    data: {
      nome,
      status,
      clienteId: clienteId ?? null,
    },
  });

  revalidatePath('/projetos');
  revalidatePath(`/projetos/${id}`);
}

/** Excluir um projeto (scoped por usuário) */
export async function excluirProjeto(formData: FormData) {
  const usuarioId = await meId();
  const id = Number(formData.get('id'));
  if (!id) throw new Error('Projeto inválido');

  await prisma.projeto.deleteMany({ where: { id, usuarioId } });

  revalidatePath('/projetos');
}

/** Excluir vários projetos (scoped por usuário) */
export async function excluirProjetosEmLote(formData: FormData) {
  const usuarioId = await meId();
  const idsRaw = formData.getAll('ids');
  const ids = idsRaw.map(v => Number(v)).filter(n => Number.isFinite(n));
  if (!ids.length) throw new Error('Selecione ao menos um projeto.');

  await prisma.projeto.deleteMany({
    where: { id: { in: ids }, usuarioId },
  });

  revalidatePath('/projetos');
}
