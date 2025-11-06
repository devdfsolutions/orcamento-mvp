"use client";

import React from "react";
import { useFormStatus } from "react-dom";

export function PendingFieldset({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return <fieldset disabled={pending}>{children}</fieldset>;
}

export function SubmitButton({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? (
        <span className="flex items-center gap-2">
          <span className="spinner" aria-hidden />
          Salvando...
        </span>
      ) : (
        children
      )}
      <style>{`
        .spinner {
          width: 14px; height: 14px;
          border-radius: 9999px;
          border: 2px solid rgba(255,255,255,.4);
          border-top-color: #fff;
          display: inline-block;
          animation: spin .8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </button>
  );
}

/** Overlay que cobre o container pai quando pending=true */
export function PendingOverlay() {
  const { pending } = useFormStatus();
  if (!pending) return null;
  return (
    <div className="pending-overlay" aria-hidden>
      <div className="pending-box">
        <span className="spinner-box" />
        <span>Salvando...</span>
      </div>
      <style>{`
        .pending-overlay {
          position: absolute; inset: 0;
          background: rgba(245,246,248,.55);
          display: grid; place-items: center;
          backdrop-filter: blur(1px);
          pointer-events: all; /* bloqueia cliques */
        }
        .pending-box {
          display:flex; gap:10px; align-items:center;
          background:#0f172a; color:#fff;
          border-radius: 9999px; padding: 8px 14px;
          box-shadow: 0 6px 20px rgba(15,23,42,.25);
          font-size: .925rem; font-weight: 500;
        }
        .spinner-box {
          width: 14px; height: 14px;
          border-radius: 9999px;
          border: 2px solid rgba(255,255,255,.3);
          border-top-color: #fff;
          animation: spin .8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
