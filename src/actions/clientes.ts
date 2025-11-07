'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getSupabaseServer } from '@/lib/supabaseServer';

/* ===== helpers ===== */
const onlyDigits = (s: string) => s.replace(/\D+/g, '');

function normStr(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? '').trim();
  return s ? s : null;
}

async function meId(): Promise<number> {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado.');
  const me = await prisma.usuario.findUnique({
    where: { supabaseUserId: user.id },
    select: { id: true },
  });
  if (!me) throw new Error('Usuário da aplicação não encontrado.');
  return me.id;
}

/** cria/atualiza SEM pontuação no CPF/CNPJ (guardamos só dígitos) */
function normalizeCpfCnpjEmailTelefone(payload: {
  cpf?: string | null;
  cnpj?: string | null;
  email?: string | null;
  telefone?: string | null;
}) {
  const out: Record<string, string | null | undefined> = {};
  if ('cpf' in payload) out.cpf = payload.cpf ? onlyDigits(payload.cpf) : null;
  if ('cnpj' in payload) out.cnpj = payload.cnpj ? onlyDigits(payload.cnpj) : null;
  if ('email' in payload) out.email = payload.email ? payload.email.trim() : null;
  if ('telefone' in payload) out.telefone = payload.telefone ? payload.telefone.trim() : null;
  return out;
}

/* ===== ACTIONS ===== */

/** Criar cliente do usuário logado */
export async function criarClienteUsuario(formData: FormData) {
  const usuarioId = await meId();
  const nome = String(formData.get('nome') ?? '').trim();
  if (!nome) throw new Error('Nome é obrigatório.');

  const cpf = normStr(formData.get('cpf'));
  const cnpj = normStr(formData.get('cnpj'));
  const email = normStr(formData.get('email'));
  const telefone = normStr(formData.get('telefone'));
  const endereco = normStr(formData.get('endereco'));

  const norm = normalizeCpfCnpjEmailTelefone({ cpf, cnpj, email, telefone });

  await prisma.clienteUsuario.create({
    data: {
      usuarioId,
      nome,
      cpf: norm.cpf ?? null,
      cnpj: norm.cnpj ?? null,
      email: norm.email ?? null,
      telefone: norm.telefone ?? null,
      endereco: endereco ?? null,
    },
  });

  revalidatePath('/cadastros/clientes');
}

/** Atualizar cliente do usuário (escopo por usuarioId) */
export async function atualizarClienteUsuario(formData: FormData) {
  const usuarioId = await meId();

  const id = Number(formData.get('id'));
  if (!id) throw new Error('ID inválido.');

  const nome = String(formData.get('nome') ?? '').trim();
  if (!nome) throw new Error('Nome obrigatório.');

  const cpf = normStr(formData.get('cpf'));
  const cnpj = normStr(formData.get('cnpj'));
  const email = normStr(formData.get('email'));
  const telefone = normStr(formData.get('telefone'));
  const endereco = normStr(formData.get('endereco'));

  const norm = normalizeCpfCnpjEmailTelefone({ cpf, cnpj, email, telefone });

  await prisma.clienteUsuario.updateMany({
    where: { id, usuarioId },
    data: {
      nome,
      cpf: norm.cpf ?? null,
      cnpj: norm.cnpj ?? null,
      email: norm.email ?? null,
      telefone: norm.telefone ?? null,
      endereco: endereco ?? null,
    },
  });

  revalidatePath('/cadastros/clientes');
}

/** Excluir cliente (escopo por usuarioId) */
export async function excluirClienteUsuario(formData: FormData) {
  const usuarioId = await meId();
  const id = Number(formData.get('id'));
  if (!id) throw new Error('ID inválido.');

  await prisma.clienteUsuario.deleteMany({ where: { id, usuarioId } });

  revalidatePath('/cadastros/clientes');
}
