// src/lib/supabaseServer.ts
import 'server-only'; // <— garante que este módulo só é usado no servidor

import { cookies, headers } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export function getSupabaseServer() {
  const cookieStore = cookies();
  const h = headers();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options?: any) {
          cookieStore.set(name, value, options);
        },
        remove(name: string, options?: any) {
          cookieStore.set(name, '', { ...options, maxAge: 0 });
        },
      },
      headers: {
        get(key: string) {
          return h.get(key) ?? undefined;
        },
      },
    }
  );
}
