'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSupabaseServer } from '@/lib/supabaseServer';

/** Normaliza enum do tipo vindo do formulário */
function parseTipo(v: FormDataEntryValue | null): 'PRODUTO' | 'SERVICO' | 'AMBOS' {
  const t = String(v ?? 'AMBOS').toUpperCase();
  if (t === 'PRODUTO' || t === 'SERVICO' || t === 'AMBOS') return t;
  return 'AMBOS';
}

const PAGE = '/cadastros/produtos';

function backWithError(err: unknown) {
  const msg =
    (err as any)?.message ??
    (typeof err === 'string' ? err : 'Erro inesperado ao salvar.');
  console.error('[produtos action]', err);
  redirect(`${PAGE}?e=${encodeURIComponent(msg)}`);
}

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

/** CREATE (sem preços) */
export async function criarProduto(formData: FormData) {
  try {
    const meId = await getMeId();

    const nome = String(formData.get('nome') ?? '').trim();
    const unidadeMedidaId = Number(formData.get('unidadeMedidaId'));
    const categoria = (String(formData.get('categoria') ?? '').trim() || null) as string | null;
    const tipo = parseTipo(formData.get('tipo'));

    if (!nome) throw new Error('Nome é obrigatório.');
    if (!Number.isFinite(unidadeMedidaId)) throw new Error('Unidade de medida inválida.');

    // valida FK explicitamente (mensagem melhor que P2003) e escopo do dono
    const um = await prisma.unidadeMedida.findFirst({
      where: { id: unidadeMedidaId, usuarioId: meId },
      select: { id: true },
    });
    if (!um) throw new Error('Unidade de medida não encontrada para este usuário.');

    await prisma.produtoServico.create({
      data: {
        usuarioId: meId,     // <- essencial
        nome,
        unidadeMedidaId,
        categoria,
        tipo,
      },
    });

    revalidatePath(PAGE);
    redirect(`${PAGE}?ok=1`);
  } catch (err) {
    backWithError(err);
  }
}

/** UPDATE (sem preços) */
export async function atualizarProduto(formData: FormData) {
  try {
    const meId = await getMeId();

    const id = Number(formData.get('id'));
    if (!Number.isFinite(id)) throw new Error('ID inválido.');

    const nome = String(formData.get('nome') ?? '').trim();
    const unidadeMedidaId = Number(formData.get('unidadeMedidaId'));
    const categoria = (String(formData.get('categoria') ?? '').trim() || null) as string | null;
    const tipo = parseTipo(formData.get('tipo'));

    if (!nome) throw new Error('Nome é obrigatório.');
    if (!Number.isFinite(unidadeMedidaId)) throw new Error('Unidade de medida inválida.');

    // checa dono do produto
    const exists = await prisma.produtoServico.findFirst({
      where: { id, usuarioId: meId },
      select: { id: true },
    });
    if (!exists) throw new Error('Produto não encontrado.');

    // checa dono da UM
    const um = await prisma.unidadeMedida.findFirst({
      where: { id: unidadeMedidaId, usuarioId: meId },
      select: { id: true },
    });
    if (!um) throw new Error('Unidade de medida não encontrada para este usuário.');

    await prisma.produtoServico.update({
      where: { id },
      data: {
        nome,
        unidadeMedidaId,
        categoria,
        tipo,
      },
    });

    revalidatePath(PAGE);
    redirect(`${PAGE}?ok=1`);
  } catch (err) {
    backWithError(err);
  }
}

/** DELETE */
export async function excluirProduto(formData: FormData) {
  try {
    const meId = await getMeId();

    const id = Number(formData.get('id'));
    if (!Number.isFinite(id)) throw new Error('ID inválido.');

    const { count } = await prisma.produtoServico.deleteMany({
      where: { id, usuarioId: meId },
    });
    if (count === 0) throw new Error('Produto não encontrado.');

    revalidatePath(PAGE);
    redirect(`${PAGE}?ok=1`);
  } catch (err) {
    backWithError(err);
  }
}
