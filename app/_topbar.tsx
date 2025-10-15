"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Me = { nome: string; role: "ADM" | "USER" } | null;

export default function Topbar() {
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState<Me>(null);

  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setMe(d?.role ? { nome: d.nome, role: d.role } : null))
      .catch(() => setMe(null));
  }, []);

  return (
    <>
      {/* Barra superior */}
      <header className="flex items-center justify-between bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setOpen(!open)}
            className="p-2 rounded-md border border-gray-300 hover:bg-gray-100 transition"
          >
            ☰
          </button>
          <Link href="/" className="font-bold text-gray-900 text-lg">
            Gerador de Projetos
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/projetos" className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-100">
            Projetos
          </Link>

          {me?.role === "ADM" && (
            <Link
              href="/admin/usuarios"
              className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-100"
            >
              Admin
            </Link>
          )}

          {!me && (
            <Link href="/login" className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-100">
              Entrar
            </Link>
          )}

          {me && (
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                location.href = "/login";
              }}
              className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-100"
            >
              Sair
            </button>
          )}
        </div>
      </header>

      {/* Menu lateral */}
      {open && (
        <aside className="fixed left-0 top-0 w-64 h-full bg-white shadow-lg z-30 p-4 border-r border-gray-200 animate-slide-in">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-semibold text-lg">Menu</h2>
            <button
              onClick={() => setOpen(false)}
              className="p-2 rounded-md hover:bg-gray-100 text-gray-700"
            >
              ✕
            </button>
          </div>

          <nav className="flex flex-col gap-3">
            <Link href="/projetos" className="hover:underline">
              Projetos
            </Link>
            <Link href="/cadastros/clientes" className="hover:underline">
              Clientes
            </Link>
            <Link href="/cadastros/produtos" className="hover:underline">
              Produtos & Serviços
            </Link>
            <Link href="/cadastros/fornecedores" className="hover:underline">
              Fornecedores
            </Link>
            <Link href="/cadastros/unidades" className="hover:underline">
              Unidades
            </Link>
            <Link href="/cadastros/vinculos" className="hover:underline">
              Vínculos
            </Link>
          </nav>
        </aside>
      )}
    </>
  );
}
