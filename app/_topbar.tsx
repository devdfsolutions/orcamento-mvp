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
  const [open, setOpen] = useState(false);

  // pega /api/me (quem está logado)
  useEffect(() => {
    fetch('/api/me', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setMe(d?.role ? { nome: d.nome, role: d.role } : null))
      .catch(() => setMe(null));
  }, []);

  // trava/destrava o scroll quando o menu abre
  useEffect(() => {
    const el = document.documentElement; // <html>
    if (open) el.style.overflow = 'hidden';
    else el.style.overflow = '';
    return () => { el.style.overflow = ''; };
  }, [open]);

  // esconde topbar no /login
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/login')) {
    return null;
  }

  return (
    <>
      <header style={{
        position: 'sticky', top: 0, zIndex: 100, // header acima do conteúdo
        background: '#fff', borderBottom: '1px solid #eee'
      }}>
        <div style={{
          height: 56, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 12, padding: '0 16px',
          maxWidth: 1100, margin: '0 auto'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              aria-label="menu"
              onClick={() => setOpen(true)}
              style={{
                width: 34, height: 34, borderRadius: 8, border: '1px solid #ddd',
                background: '#fff', cursor: 'pointer'
              }}
            >
              ☰
            </button>
            <a href="/" style={{ textDecoration: 'none', color: '#111', fontWeight: 700 }}>
              Gerador de Projetos
            </a>
          </div>

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

      {/* BACKDROP */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,                         // cobre a viewport inteira
            background: 'rgba(0,0,0,.28)',
            backdropFilter: 'blur(1px)',
            zIndex: 1000                      // acima do header e de tudo
          }}
        />
      )}

      {/* DRAWER */}
      <aside
        aria-hidden={!open}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100vh',
          width: 320,
          background: '#fff',
          borderLeft: '1px solid #eee',
          boxShadow: '0 0 40px rgba(0,0,0,.15)',
          zIndex: 1001,                      // acima do backdrop para ser clicável
          transform: `translateX(${open ? '0' : '100%'})`,
          transition: 'transform .25s ease',
          display: 'grid',
          gridTemplateRows: '56px 1fr',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16 }}>
          <b>Menu</b>
          <button
            onClick={() => setOpen(false)}
            style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}
            aria-label="Fechar menu"
          >
            ×
          </button>
        </div>

        <nav style={{ display: 'grid', gap: 4, padding: '0 16px 16px' }}>
          <a onClick={() => setOpen(false)} href="/projetos" style={linkItem}>Projetos</a>
          <a onClick={() => setOpen(false)} href="/cadastros/clientes" style={linkItem}>Clientes</a>
          <a onClick={() => setOpen(false)} href="/cadastros/produtos" style={linkItem}>Produtos & Serviços</a>
          <a onClick={() => setOpen(false)} href="/cadastros/fornecedores" style={linkItem}>Fornecedores</a>
          <a onClick={() => setOpen(false)} href="/cadastros/unidades" style={linkItem}>Unidades</a>
          <a onClick={() => setOpen(false)} href="/cadastros/vinculos" style={linkItem}>Vínculos</a>
        </nav>
      </aside>
    </>
  );
}

const linkItem: React.CSSProperties = {
  display: 'block',
  padding: '10px 12px',
  borderRadius: 8,
  textDecoration: 'none',
  color: '#111',
  border: '1px solid #eee',
  background: '#fff'
};
