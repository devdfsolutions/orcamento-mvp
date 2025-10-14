import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const supabase = await getSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ user: null });

  const u = await prisma.usuario.findUnique({
    where: { supabaseUserId: session.user.id },
    select: { id: true, nome: true, email: true, role: true },
  });

  return NextResponse.json(u ?? { user: null });
}
