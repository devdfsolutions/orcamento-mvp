// src/lib/authUser.ts
import { prisma } from '@/lib/prisma';
import { getSupabaseServer } from '@/lib/supabaseServer';

export type AuthUser = {
  supabaseId: string;
  id: number;
  role: 'ADM' | 'USER';
  email: string;
  name: string;
};

/**
 * Lê usuário do Supabase e garante o registro espelhado na tabela Usuario.
 * Se `required` for true e não houver sessão, retorna null (o caller pode redirecionar).
 */
export async function getAuthUser(required = true): Promise<AuthUser | null> {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return required ? null : null;
  }

  // Tenta achar o perfil local
  let me = await prisma.usuario.findUnique({
    where: { supabaseUserId: user.id },
    select: { id: true, role: true, email: true, nome: true, supabaseUserId: true },
  });

  // Se não existir ainda, cria com defaults
  if (!me) {
    const email = user.email ?? '';
    const nome =
      (user.user_metadata as any)?.name ||
      (user.user_metadata as any)?.full_name ||
      email.split('@')[0] ||
      'Usuário';

    me = await prisma.usuario.create({
      data: {
        supabaseUserId: user.id,
        email,
        nome,
        // role default = USER conforme schema
      },
      select: { id: true, role: true, email: true, nome: true, supabaseUserId: true },
    });
  }

  return {
    supabaseId: me.supabaseUserId,
    id: me.id,
    role: me.role as 'ADM' | 'USER',
    email: me.email,
    name: me.nome,
  };
}

/**
 * Versão que exige usuário autenticado. Lança se não houver.
 * Útil em server actions.
 */
export async function authUser(): Promise<AuthUser> {
  const me = await getAuthUser(true);
  if (!me) {
    throw new Error('Sessão expirada ou inválida');
  }
  return me;
}
