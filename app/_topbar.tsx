// app/_topbar.tsx
'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
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
  const pathname = usePathname();

  // 🔒 NÃO renderiza Topbar em telas de auth
  if (pathname === '/login' || pathname?.startsWith('/auth')) return null;

  const [me, setMe] = useState<Me>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetch('/api/me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setMe(d?.role ? { nome: d.nome, role: d.role } : null))
      .catch(() => setMe(null));
  }, []);

  // fecha o menu quando trocar de rota
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 40, background: '#fff', borderBottom: '1px solid #eee' }}>
      <div
        style={{
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '0 16px',
          maxWidth: 1100,
          margin: '0 auto',
        }}
      >
        {/* Hamburguer + título */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            aria-label="Abrir menu"
            onClick={() => setMenuOpen((v) => !v)}
            style={{
              width: 34,
              height: 34,
              display: 'grid',
              placeItems: 'center',
              borderRadius: 8,
              border: '1px solid #ddd',
              background: '#fff',
              cursor: 'pointer',
            }}
          >
            ☰
          </button>

          <a href="/" style={{ textDecoration: 'none', color: '#111', fontWeight: 700 }}>
            Gerador de Projetos
          </a>
        </div>

        {/* Ações à direita */}
        <nav style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <a href="/projetos" style={navBtn}>
            Projetos
          </a>
          {me?.role === 'ADM' && (
            <a href="/admin/usuarios" style={navBtn}>
              Admin
            </a>
          )}
          {!me && (
            <a href="/login" style={navBtn}>
              Entrar
            </a>
          )}
          {me && (
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                location.href = '/login';
              }}
              style={navBtn as React.CSSProperties}
            >
              Sair
            </button>
          )}
        </nav>
      </div>

      {/* Drawer lateral */}
      {menuOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 30,
            display: 'flex',
          }}
          onClick={() => setMenuOpen(false)}
        >
          <div
            style={{ flex: 1, background: 'rgba(0,0,0,.2)' }}
            aria-hidden
          />
          <aside
            role="dialog"
            aria-label="Menu"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 260,
              maxWidth: '80vw',
              background: '#fff',
              borderLeft: '1px solid #eee',
              boxShadow: '-6px 0 24px rgba(0,0,0,.08)',
              padding: 14,
              display: 'grid',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <b>Menu</b>
              <button
                onClick={() => setMenuOpen(false)}
                aria-label="Fechar"
                style={{
                  width: 28,
                  height: 28,
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: 6,
                  border: '1px solid #ddd',
                  background: '#fff',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            <a href="/projetos" style={{ textDecoration: 'none', color: '#111' }}>
              Projetos
            </a>
            <a href="/cadastros/clientes" style={{ textDecoration: 'none', color: '#111' }}>
              Clientes
            </a>
            <a href="/cadastros/produtos" style={{ textDecoration: 'none', color: '#111' }}>
              Produtos & Serviços
            </a>
            <a href="/cadastros/fornecedores" style={{ textDecoration: 'none', color: '#111' }}>
              Fornecedores
            </a>
            <a href="/cadastros/unidades" style={{ textDecoration: 'none', color: '#111' }}>
              Unidades
            </a>
            <a href="/cadastros/vinculos" style={{ textDecoration: 'none', color: '#111' }}>
              Vínculos
            </a>
          </aside>
        </div>
      )}
    </header>
  );
}
