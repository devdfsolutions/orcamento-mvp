'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';

/* ===== helpers ===== */
const onlyDigits = (s: string) => s.replace(/\D+/g, '');

function normStr(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? '').trim();
  return s ? s : null;
}

/** cria/atualiza SEM pontuação no CPF/CNPJ (guardamos só dígitos) */
function normalizeCpfCnpjEmailTelefone(payload: {
  cpf?: string | null;
  cnpj?: string | null;
  email?: string | null;
  telefone?: string | null;
}) {
  const out: Record<string, string | null | undefined> = {};

  if ('cpf' in payload)     out.cpf     = payload.cpf ? onlyDigits(payload.cpf) : null;
  if ('cnpj' in payload)    out.cnpj    = payload.cnpj ? onlyDigits(payload.cnpj) : null;
  if ('email' in payload)   out.email   = payload.email ? payload.email.trim() : null;
  if ('telefone' in payload) out.telefone = payload.telefone ? payload.telefone.trim() : null;

  return out;
}

/* ===== ACTIONS ===== */

/** Criar cliente do usuário logado (usuarioId vem do formulário hidden) */
export async function criarClienteUsuario(formData: FormData) {
  const usuarioId = Number(formData.get('usuarioId'));
  const nome = String(formData.get('nome') ?? '').trim();
  if (!usuarioId || !nome) throw new Error('Usuário inválido ou nome obrigatório.');

  const cpf  = normStr(formData.get('cpf'));
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

/** Atualizar cliente do usuário (não muda o usuarioId) */
export async function atualizarClienteUsuario(formData: FormData) {
  const id = Number(formData.get('id'));
  if (!id) throw new Error('ID inválido.');

  const nome = String(formData.get('nome') ?? '').trim();
  if (!nome) throw new Error('Nome obrigatório.');

  const cpf  = normStr(formData.get('cpf'));
  const cnpj = normStr(formData.get('cnpj'));
  const email = normStr(formData.get('email'));
  const telefone = normStr(formData.get('telefone'));
  const endereco = normStr(formData.get('endereco'));

  const norm = normalizeCpfCnpjEmailTelefone({ cpf, cnpj, email, telefone });

  await prisma.clienteUsuario.update({
    where: { id },
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

/** Excluir cliente (soft-checks como uso em projetos você pode colocar depois) */
export async function excluirClienteUsuario(formData: FormData) {
  const id = Number(formData.get('id'));
  if (!id) throw new Error('ID inválido.');

  await prisma.clienteUsuario.delete({ where: { id } });

  revalidatePath('/cadastros/clientes');
}
