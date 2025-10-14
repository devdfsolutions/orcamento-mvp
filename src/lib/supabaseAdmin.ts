// src/lib/supabaseAdmin.ts
import { createClient } from '@supabase/supabase-js';

export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY ausente no .env');
  }
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
