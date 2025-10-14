import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

/**
 * Server Components (Next 15): cookies() é async e é read-only aqui.
 * Para ler sessão (auth.getSession) basta implementar get/set/remove,
 * mesmo que set/remove sejam no-ops (sem efeito) nesse contexto.
 */
export async function getSupabaseServer() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // no-ops em Server Components
        set(_name: string, _value: string, _options?: any) {},
        remove(_name: string, _options?: any) {},
      },
    }
  );
}
