// app/api/projetos/criar-and-go/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSupabaseServer } from '@/lib/supabaseServer';

async function getMeuUsuarioId() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado.');

  const me = await prisma.usuario.findUnique({
    where: { supabaseUserId: user.id },
    select: { id: true },
  });
  if (!me) throw new Error('Usuário não encontrado.');
  return me.id;
}

export async function POST(req: Request) {
  try {
    // esta rota é chamada por <form>, então usamos formData()
    const form = await req.formData();

    const nome = String(form.get('nome') ?? '').trim();
    const clienteIdRaw = form.get('clienteId');
    const clienteId = clienteIdRaw ? Number(clienteIdRaw) : null;

    if (!nome) {
      return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 });
    }

    const usuarioId = await getMeuUsuarioId();

    // valida cliente (se veio) e se pertence ao mesmo usuarioId
    if (clienteId) {
      const cli = await prisma.clienteUsuario.findUnique({
        where: { id: clienteId },
        select: { usuarioId: true },
      });
      if (!cli || cli.usuarioId !== usuarioId) {
        return NextResponse.json({ error: 'Cliente inválido para este usuário.' }, { status: 400 });
      }
    }

    // cria projeto COM usuarioId
    const projeto = await prisma.projeto.create({
      data: {
        usuarioId,
        nome,
        status: 'rascunho',              // já tem default, mas mantive explícito
        ...(clienteId ? { clienteId } : {}),
      },
      select: { id: true },
    });

    // cria 1ª estimativa (se precisar depois podemos usar ensure)
    await prisma.estimativa.create({
      data: {
        usuarioId,            // importante: Estimativa também tem usuarioId
        projetoId: projeto.id,
        nome: 'Estimativa',
      },
    });

    return NextResponse.json({ id: projeto.id }, { status: 201 });
  } catch (err: any) {
    console.error('[api projetos/criar-and-go]', err);
    const msg = err?.message ?? 'Falha ao criar projeto';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
