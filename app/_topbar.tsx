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
      <header className="flex items-center justify-between bg-white border-b border-gray-200 px-5 py-3 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setOpen(true)}
            className="p-2 border rounded-md hover:bg-gray-100 transition"
          >
            ☰
          </button>
          <Link href="/" className="font-bold text-gray-900 text-lg">
            Gerador de Projetos
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/projetos"
            className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-100"
          >
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
            <Link
              href="/login"
              className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-100"
            >
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

      {/* Overlay escuro */}
      {open && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-20 transition-opacity duration-300"
          onClick={() => setOpen(false)}
        ></div>
      )}

      {/* Menu lateral */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 shadow-lg transform transition-all duration-300 z-30 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="font-semibold text-lg">Menu</h2>
          <button
            onClick={() => setOpen(false)}
            className="p-2 rounded-md hover:bg-gray-100 text-gray-700"
          >
            ✕
          </button>
        </div>

        <nav className="flex flex-col p-4 space-y-2">
          <Link
            href="/projetos"
            className="hover:bg-gray-100 rounded-md px-3 py-2 flex items-center gap-2"
            onClick={() => setOpen(false)}
          >
            📁 Projetos
          </Link>
          <Link
            href="/cadastros/clientes"
            className="hover:bg-gray-100 rounded-md px-3 py-2 flex items-center gap-2"
            onClick={() => setOpen(false)}
          >
            👤 Clientes
          </Link>
          <Link
            href="/cadastros/produtos"
            className="hover:bg-gray-100 rounded-md px-3 py-2 flex items-center gap-2"
            onClick={() => setOpen(false)}
          >
            🧱 Produtos & Serviços
          </Link>
          <Link
            href="/cadastros/fornecedores"
            className="hover:bg-gray-100 rounded-md px-3 py-2 flex items-center gap-2"
            onClick={() => setOpen(false)}
          >
            🚚 Fornecedores
          </Link>
          <Link
            href="/cadastros/unidades"
            className="hover:bg-gray-100 rounded-md px-3 py-2 flex items-center gap-2"
            onClick={() => setOpen(false)}
          >
            ⚙️ Unidades
          </Link>
          <Link
            href="/cadastros/vinculos"
            className="hover:bg-gray-100 rounded-md px-3 py-2 flex items-center gap-2"
            onClick={() => setOpen(false)}
          >
            🔗 Vínculos
          </Link>
        </nav>
      </aside>
    </>
  );
}
