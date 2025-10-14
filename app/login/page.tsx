'use client';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) { setErr(error.message); return; }

    const me = await fetch('/api/me', { cache: 'no-store' }).then(r => r.json());
    router.push(me?.role === 'ADM' ? '/admin/usuarios' : '/projetos');
  }

  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f7f7f8',
        padding: 16,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 360,
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          padding: 20,
          boxShadow: '0 6px 20px rgba(0,0,0,0.06)',
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12, textAlign: 'center' }}>
          Entrar
        </h1>

        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 10 }}>
          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8 }}
          />
          <input
            placeholder="Senha"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            style={{ padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8 }}
          />
          {err && (
            <div style={{ color: '#b00', fontSize: 13, lineHeight: 1.2 }}>
              {err}
            </div>
          )}
          <button
            type="submit"
            style={{
              padding: '10px 12px',
              borderRadius: 8,
              background: '#111',
              color: '#fff',
              border: 0,
              cursor: 'pointer',
            }}
          >
            Entrar
          </button>
        </form>
      </div>
    </main>
  );
}
