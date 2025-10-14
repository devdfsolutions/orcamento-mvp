'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Nav = { href: string; label: string; group?: string };

// ajuste aqui se algum caminho tiver nome diferente
const links: Nav[] = [
  { href: '/projetos', label: 'Projetos' },

  { href: '/cadastros/clientes', label: 'Clientes', group: 'Cadastros' },
  { href: '/cadastros/unidades', label: 'Unidades', group: 'Cadastros' },
  { href: '/cadastros/produtos', label: 'Produtos & Serviços', group: 'Cadastros' },
  { href: '/cadastros/fornecedores', label: 'Fornecedores', group: 'Cadastros' },
  { href: '/cadastros/vinculos', label: 'Vínculos', group: 'Cadastros' },
  { href: '/projetos/novo', label: 'Novo Projeto', group: 'Cadastros' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(true);

  React.useEffect(() => {
    const saved = localStorage.getItem('sb-open');
    if (saved != null) setOpen(saved === '1');
  }, []);
  React.useEffect(() => {
    localStorage.setItem('sb-open', open ? '1' : '0');
  }, [open]);

  const groups = Array.from(new Set(links.map(l => l.group).filter(Boolean))) as string[];

  return (
    <aside
      style={{
        width: open ? 230 : 50,
        transition: 'width .18s ease',
        borderRight: '1px solid #eee',
        background: '#fff',
        height: '100dvh',
        position: 'sticky',
        top: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* topo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, borderBottom: '1px solid #f2f2f2' }}>
        <button
          aria-label="Alternar menu"
          onClick={() => setOpen(o => !o)}
          style={{
            width: 36, height: 36, borderRadius: 8, border: '1px solid #ddd',
            background: '#fafafa', cursor: 'pointer'
          }}
        >
          <div style={{ width: 18, height: 2, background: '#111', margin: '0 auto 3px' }} />
          <div style={{ width: 18, height: 2, background: '#111', margin: '0 auto 3px' }} />
          <div style={{ width: 18, height: 2, background: '#111', margin: '0 auto' }} />
        </button>
        {open && <b style={{ fontSize: 14 }}>Gerador de Projetos</b>}
      </div>

      {/* atalhos sem grupo */}
      <nav style={{ padding: 8 }}>
        {links.filter(l => !l.group).map(l => (
          <NavItem key={l.href} href={l.href} active={pathname.startsWith(l.href)} open={open}>
            {l.label}
          </NavItem>
        ))}
      </nav>

      {/* grupos */}
      <div style={{ padding: 8, marginTop: 6, overflowY: 'auto' }}>
        {groups.map(g => (
          <div key={g} style={{ marginBottom: 10 }}>
            {open && <div style={{ fontSize: 11, color: '#888', padding: '6px 8px' }}>{g}</div>}
            {links.filter(l => l.group === g).map(l => (
              <NavItem key={l.href} href={l.href} active={pathname.startsWith(l.href)} open={open}>
                {l.label}
              </NavItem>
            ))}
          </div>
        ))}
      </div>
    </aside>
  );
}

function NavItem({
  href, children, active, open,
}: { href: string; children: React.ReactNode; active?: boolean; open: boolean }) {
  return (
    <Link
      href={href}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 10px', marginBottom: 4, borderRadius: 8,
        color: active ? '#111' : '#333', textDecoration: 'none',
        background: active ? '#f2f2f2' : undefined,
        border: active ? '1px solid #e5e5e5' : '1px solid transparent',
        overflow: 'hidden', whiteSpace: 'nowrap',
      }}
      title={String(children)}
    >
      <span style={{
        width: 8, height: 8, borderRadius: 999,
        background: active ? '#111' : '#bbb', flex: '0 0 auto'
      }} />
      {open && <span>{children}</span>}
    </Link>
  );
}
