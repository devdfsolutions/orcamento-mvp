import { prisma } from '@/lib/prisma';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';

export async function requireUsuarioId() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const u = await prisma.usuario.upsert({
    where: { supabaseUserId: user.id },
    update: {},
    create: {
      supabaseUserId: user.id,
      nome: user.user_metadata?.name ?? (user.email ?? 'Usuário'),
      email: user.email!,
    },
  });
  return u.id;
}
