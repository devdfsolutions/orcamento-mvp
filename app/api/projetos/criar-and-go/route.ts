// app/api/projetos/criar-and-go/route.ts
export const runtime = 'nodejs';

import { prisma } from '@/lib/prisma';
import { getSupabaseServer } from '@/lib/supabaseServer';

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Usuário da aplicação (tabela Usuario) atrelado ao supabaseUserId
    const usuario = await prisma.usuario.findUnique({
      where: { supabaseUserId: user.id },
    });
    if (!usuario) {
      return Response.json({ error: 'Usuário não encontrado na base' }, { status: 400 });
    }

    const form = await req.formData();
    const nome = String(form.get('nome') ?? '').trim();
    const clienteIdRaw = form.get('clienteId');
    const clienteId = clienteIdRaw ? Number(clienteIdRaw) : null;

    if (!nome) {
      return Response.json({ error: 'Nome é obrigatório' }, { status: 400 });
    }

    // Se veio clienteId, valida que pertence ao usuário logado
    let clienteOkId: number | null = null;
    if (Number.isFinite(clienteId)) {
      const cliente = await prisma.clienteUsuario.findFirst({
        where: { id: Number(clienteId), usuarioId: usuario.id },
        select: { id: true },
      });
      if (!cliente) {
        return Response.json({ error: 'Cliente inválido' }, { status: 400 });
      }
      clienteOkId = cliente.id;
    }

    // Cria o projeto (status default "rascunho" — ver schema)
    const projeto = await prisma.projeto.create({
      data: {
        nome,
        clienteId: clienteOkId,
      },
      select: { id: true },
    });

    // Cria uma estimativa padrão ligada ao projeto
    await prisma.estimativa.create({
      data: {
        projetoId: projeto.id,
        nome: 'Estimativa',
      },
    });

    return Response.json({ id: projeto.id }, { status: 201 });
  } catch (err: any) {
    console.error('[api/projetos/criar-and-go]', err);
    const message =
      err?.message?.slice(0, 300) ?? 'Erro inesperado ao criar projeto';
    return Response.json({ error: message }, { status: 500 });
  }
}
