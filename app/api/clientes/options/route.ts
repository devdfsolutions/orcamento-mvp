// app/api/clientes/options/route.ts
export const runtime = 'nodejs';

import { prisma } from '@/lib/prisma';
import { getSupabaseServer } from '@/lib/supabaseServer';

export async function GET() {
  try {
    const supabase = getSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json([], { status: 200 });

    const usuario = await prisma.usuario.findUnique({
      where: { supabaseUserId: user.id },
      select: { id: true },
    });
    if (!usuario) return Response.json([], { status: 200 });

    const clientes = await prisma.clienteUsuario.findMany({
      where: { usuarioId: usuario.id },
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true },
    });

    return Response.json(clientes, { status: 200 });
  } catch (err) {
    console.error('[api/clientes/options]', err);
    return Response.json([], { status: 200 });
  }
}
