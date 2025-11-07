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

/** Criar projeto + 1ª estimativa e IR PARA ITENS */
export async function criarProjetoAndGo(formData: FormData) {
  const usuarioId = await meId();

  const nome = String(formData.get('nome') ?? '').trim();
  const clienteIdRaw = String(formData.get('clienteId') ?? '').trim();
  const clienteId = clienteIdRaw ? Number(clienteIdRaw) : null;

  if (!nome) throw new Error('Nome do projeto é obrigatório.');

  // valida cliente (se veio) e se pertence ao mesmo usuarioId
  if (clienteId) {
    const cli = await prisma.clienteUsuario.findUnique({
      where: { id: clienteId },
      select: { usuarioId: true },
    });
    if (!cli || cli.usuarioId !== usuarioId) {
      throw new Error('Cliente inválido para este usuário.');
    }
  }

  // cria projeto scoped por usuario
  const projeto = await prisma.projeto.create({
    data: {
      usuarioId,
      nome,
      status: 'rascunho',
      ...(clienteId ? { clienteId } : {}),
    },
    select: { id: true },
  });

  // garante 1ª estimativa
  await prisma.estimativa.create({
    data: {
      usuarioId,
      projetoId: projeto.id,
      nome: 'Estimativa V1',
    },
  });

  // não precisamos revalidar /projetos, vamos direto aos itens
  redirect(`/projetos/${projeto.id}/itens`);
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
