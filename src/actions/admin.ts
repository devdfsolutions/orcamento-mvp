'use server';

import { prisma } from '@/lib/prisma';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { revalidatePath } from 'next/cache';

type Role = 'ADM' | 'USER';

export async function criarUsuario(formData: FormData): Promise<void> {
  const nome = (formData.get('nome') ?? '').toString().trim();
  const cpf = (formData.get('cpf') ?? '').toString().trim() || null;
  const email = (formData.get('email') ?? '').toString().trim().toLowerCase();
  const telefone = (formData.get('telefone') ?? '').toString().trim() || null;
  const cnpj = (formData.get('cnpj') ?? '').toString().trim() || null;
  const role = (formData.get('role') ?? 'USER').toString().toUpperCase() as Role;
  const senha = (formData.get('senha') ?? '').toString();

  if (!nome || !email || !senha) {
    throw new Error('Nome, Email e Senha são obrigatórios.');
  }

  const admin = getSupabaseAdmin();

  // cria no Supabase Auth
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
  });
  if (createErr || !created?.user?.id) {
    throw new Error(`Erro ao criar no Auth: ${createErr?.message ?? 'desconhecido'}`);
  }
  const supabaseUserId = created.user.id;

  // upsert no banco
  await prisma.usuario.upsert({
    where: { email },
    create: { supabaseUserId, nome, cpf: cpf || undefined, email, telefone: telefone || undefined, cnpj: cnpj || undefined, role },
    update: { supabaseUserId, nome, cpf: cpf || undefined, telefone: telefone || undefined, cnpj: cnpj || undefined, role },
  });

  // atualiza a lista
  revalidatePath('/admin/usuarios');
}
