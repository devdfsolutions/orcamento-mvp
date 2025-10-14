'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Me = { nome: string; role: 'ADM' | 'USER' } | null;

const navBtn: React.CSSProperties = {
  padding: '8px 10px',
  border: '1px solid #ddd',
  borderRadius: 8,
  background: '#fff',
  cursor: 'pointer',
  color: '#111',
  textDecoration: 'none',
};

export default function Topbar() {
  const [me, setMe] = useState<Me>(null);

  useEffect(() => {
    fetch('/api/me', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setMe(d?.role ? { nome: d.nome, role: d.role } : null))
      .catch(() => setMe(null));
  }, []);

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 10,
      background: '#fff', borderBottom: '1px solid #eee'
    }}>
      <div style={{
        height: 56, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', gap: 12, padding: '0 16px',
        maxWidth: 1100, margin: '0 auto'
      }}>
        <a href="/" style={{ textDecoration: 'none', color: '#111', fontWeight: 700 }}>
          Gerador de Projetos
        </a>

        <nav style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <a href="/projetos" style={navBtn}>Projetos</a>
          {me?.role === 'ADM' && <a href="/admin/usuarios" style={navBtn}>Admin</a>}
          {!me && <a href="/login" style={navBtn}>Entrar</a>}
          {me && (
            <button
              onClick={async () => { await supabase.auth.signOut(); location.href = '/login'; }}
              style={navBtn as React.CSSProperties}
            >
              Sair
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
