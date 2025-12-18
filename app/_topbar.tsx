"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Me = { nome: string; role: "ADM" | "USER" } | null;

export default function Topbar() {
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [me, setMe] = useState<Me>(null);

  const hideTopbar = useMemo(() => {
    return pathname === "/login" || pathname?.startsWith("/auth");
  }, [pathname]);

  useEffect(() => {
    if (hideTopbar) return;

    fetch("/api/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setMe(d?.role ? { nome: d.nome, role: d.role } : null))
      .catch(() => setMe(null));
  }, [hideTopbar]);

  if (hideTopbar) return null;

  const headerStyle: React.CSSProperties = {
    position: "sticky",
    top: 0,
    zIndex: 30,
    background: "#fff",
    borderBottom: "1px solid #eee",
    padding: "8px 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    height: 56,
  };

  const btnStyle: React.CSSProperties = {
    padding: "8px 10px",
    border: "1px solid #ddd",
    borderRadius: 8,
    background: "#fff",
    cursor: "pointer",
  };

  const linkBtn: React.CSSProperties = {
    padding: "8px 12px",
    border: "1px solid #ddd",
    borderRadius: 8,
    background: "#fff",
    textDecoration: "none",
    color: "#111",
    display: "inline-block",
  };

  const overlayStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    zIndex: 20,
    display: open ? "block" : "none",
  };

  const asideStyle: React.CSSProperties = {
    position: "fixed",
    top: 0,
    left: 0,
    height: "100vh",
    width: 260,
    background: "#fff",
    borderRight: "1px solid #eee",
    boxShadow: "0 6px 24px rgba(0,0,0,0.12)",
    zIndex: 30,
    transform: open ? "translateX(0)" : "translateX(-100%)",
    transition: "transform .25s ease",
    display: "flex",
    flexDirection: "column",
  };

  const asideHeader: React.CSSProperties = {
    padding: 16,
    borderBottom: "1px solid #eee",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  };

  const menuLink: React.CSSProperties = {
    padding: "10px 14px",
    textDecoration: "none",
    color: "#111",
    borderRadius: 8,
  };

  const navWrap: React.CSSProperties = {
    padding: 12,
    display: "grid",
    gap: 6,
  };

  return (
    <>
      <header style={headerStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button style={btnStyle} onClick={() => setOpen(true)} aria-label="Abrir menu">
            ☰
          </button>
          <Link href="/" style={{ textDecoration: "none", color: "#111", fontWeight: 700 }}>
            Gerador de Projetos
          </Link>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link href="/projetos" style={linkBtn}>Projetos</Link>

          {me?.role === "ADM" && (
            <Link href="/admin/usuarios" style={linkBtn}>Admin</Link>
          )}

          {!me && <Link href="/login" style={linkBtn}>Entrar</Link>}

          {me && (
            <button
              style={btnStyle}
              onClick={async () => {
                await supabase.auth.signOut();
                location.href = "/login";
              }}
            >
              Sair
            </button>
          )}
        </div>
      </header>

      <div style={overlayStyle} onClick={() => setOpen(false)} />

      <aside style={asideStyle} aria-hidden={!open}>
        <div style={asideHeader}>
          <div style={{ fontWeight: 600 }}>Menu</div>
          <button style={btnStyle} onClick={() => setOpen(false)} aria-label="Fechar menu">
            ✕
          </button>
        </div>

        <nav style={navWrap}>
          <Link href="/cadastros/clientes" style={menuLink} onClick={() => setOpen(false)}>
            👤 Clientes
          </Link>

          <Link href="/cadastros/unidades" style={menuLink} onClick={() => setOpen(false)}>
            ⚙️ Medidas
          </Link>

          <Link href="/cadastros/categorias" style={menuLink} onClick={() => setOpen(false)}>
            🗂️ Categorias
          </Link>

          <Link href="/cadastros/fornecedores" style={menuLink} onClick={() => setOpen(false)}>
            🚚 Fornecedores
          </Link>

          <Link href="/cadastros/produtos" style={menuLink} onClick={() => setOpen(false)}>
            🧱 Produtos & Serviços
          </Link>

          <Link href="/cadastros/vinculos" style={menuLink} onClick={() => setOpen(false)}>
            🔗 Vínculos
          </Link>

          <Link href="/projetos" style={menuLink} onClick={() => setOpen(false)}>
            📁 Projetos
          </Link>
        </nav>
      </aside>
    </>
  );
}
