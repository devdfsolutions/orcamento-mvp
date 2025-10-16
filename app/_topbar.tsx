'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
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

function useIsLoginRoute() {
  const [isLogin, setIsLogin] = useState(false);
  useEffect(() => {
    setIsLogin(location.pathname.startsWith('/login'));
  }, []);
  return isLogin;
}

export default function Topbar() {
  const [me, setMe] = useState<Me>(null);
  const [open, setOpen] = useState(false);
  const isLogin = useIsLoginRoute();

  // busca usuário logado
  useEffect(() => {
    fetch('/api/me', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setMe(d?.role ? { nome: d.nome, role: d.role } : null))
      .catch(() => setMe(null));
  }, []);

  // trava o scroll do BODY quando o menu abre
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const body = document.body;
    const prev = body.style.overflow;
    if (open) body.style.overflow = 'hidden';
    else body.style.overflow = prev || '';
    return () => { body.style.overflow = prev || ''; };
  }, [open]);

  // não mostra o topbar no login
  if (isLogin) return null;

  // cria o overlay e drawer via portal
  const overlay = useMemo(() => {
    if (typeof document === 'undefined') return null;

    return createPortal(
      <>
        {/* BACKDROP cobrindo tudo */}
        {open && (
          <div
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(0,0,0,.28)',
              backdropFilter: 'blur(1px)',
              zIndex: 9998,
            }}
          />
        )}

        {/* DRAWER fixo à direita */}
        <aside
          aria-hidden={!open}
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: 320,
            height: '100vh',
            background: '#fff',
            borderLeft: '1px solid #eee',
            boxShadow: '0 0 40px rgba(0,0,0,.15)',
            zIndex: 9999,
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
              style={{
                width: 32, height: 32, borderRadius: 8,
                border: '1px solid #ddd', background: '#fff', cursor: 'pointer'
              }}
              aria-label="Fechar menu"
            >
              ×
            </button>
          </div>

          <nav style={{ display: 'grid', gap: 8, padding: '0 16px 16px' }}>
            <a onClick={() => setOpen(false)} href="/projetos" style={linkItem}>Projetos</a>
            <a onClick={() => setOpen(false)} href="/cadastros/clientes" style={linkItem}>Clientes</a>
            <a onClick={() => setOpen(false)} href="/cadastros/produtos" style={linkItem}>Produtos & Serviços</a>
            <a onClick={() => setOpen(false)} href="/cadastros/fornecedores" style={linkItem}>Fornecedores</a>
            <a onClick={() => setOpen(false)} href="/cadastros/unidades" style={linkItem}>Unidades</a>
            <a onClick={() => setOpen(false)} href="/cadastros/vinculos" style={linkItem}>Vínculos</a>
          </nav>
        </aside>
      </>,
      document.body
    );
  }, [open]);

  return (
    <>
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: '#fff',
        borderBottom: '1px solid #eee'
      }}>
        <div style={{
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '0 16px',
          maxWidth: 1100,
          margin: '0 auto'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              aria-label="menu"
              onClick={() => setOpen(true)}
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                border: '1px solid #ddd',
                background: '#fff',
                cursor: 'pointer'
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

      {overlay}
    </>
  );
}

const linkItem: React.CSSProperties = {
  display: 'block',
  padding: '14px 12px',
  borderRadius: 10,
  textDecoration: 'none',
  color: '#111',
  border: '1px solid #eee',
  background: '#fff'
};
