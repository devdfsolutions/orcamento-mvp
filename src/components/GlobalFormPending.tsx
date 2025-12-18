"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Overlay global que aparece ao enviar QUALQUER form (server actions).
 * Também fecha <details open> e remove .editing (linhas em edição) automaticamente.
 */
export default function GlobalFormPending() {
  const [pending, setPending] = useState(false);
  const pathname = usePathname();
  const sp = useSearchParams();

  // Sempre que navegar/atualizar rota (redirect, refresh etc), desliga o loading
  useEffect(() => {
    setPending(false);
  }, [pathname, sp]);

  useEffect(() => {
    const onSubmitCapture = () => {
      setPending(true);

      // fecha todos os <details> abertos (ex.: botão "Editar")
      document.querySelectorAll("details[open]").forEach((d) => {
        d.removeAttribute("open");
      });

      // remove modo edição de qualquer linha marcada
      document.querySelectorAll("tr.editing").forEach((tr) => {
        tr.classList.remove("editing");
      });
    };

    window.addEventListener("submit", onSubmitCapture, true);

    // fallback: se der reload completo, garante que some
    window.addEventListener("pageshow", () => setPending(false));

    return () => {
      window.removeEventListener("submit", onSubmitCapture, true);
      window.removeEventListener("pageshow", () => setPending(false));
    };
  }, []);

  if (!pending) return null;

  return (
    <div
      aria-live="polite"
      aria-busy="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(255,255,255,.72)",
        backdropFilter: "blur(2px)",
        display: "grid",
        placeItems: "center",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 14px",
          borderRadius: 12,
          border: "1px solid #e5e7eb",
          background: "#fff",
          boxShadow: "0 8px 30px rgba(0,0,0,.08)",
          fontSize: 14,
          color: "#111827",
        }}
      >
        <span
          style={{
            width: 18,
            height: 18,
            borderRadius: 999,
            border: "2px solid #d1d5db",
            borderTopColor: "#111827",
            display: "inline-block",
            animation: "spin .8s linear infinite",
          }}
        />
        Salvando...
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
