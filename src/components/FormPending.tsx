'use client';

import * as React from 'react';
import { useFormStatus } from 'react-dom';

/**
 * Mostra um overlay “aguarde…” enquanto QUALQUER <form> com estes
 * componentes estiver em submissão (pending).
 *
 * Como usar:
 * <form action={...}>
 *   <PendingOverlay />
 *   <PendingFieldset>
 *     ... inputs ...
 *     <SubmitButton>Salvar</SubmitButton>
 *   </PendingFieldset>
 * </form>
 */

/* ============ estilos ============ */
const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(255,255,255,0.55)',
  backdropFilter: 'blur(2px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 50,
};

const boxStyle: React.CSSProperties = {
  padding: '14px 16px',
  borderRadius: 10,
  border: '1px solid #e5e5e5',
  background: '#fff',
  boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  fontSize: 14,
  color: '#333',
};

const spinnerStyle: React.CSSProperties = {
  width: 16,
  height: 16,
  border: '2px solid #ddd',
  borderTopColor: '#111',
  borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
};

/* animação do spinner */
const GlobalStyles = () => (
  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
);

/* ============ componentes ============ */

/** Overlay de carregamento enquanto o form está pendente */
export function PendingOverlay() {
  const { pending } = useFormStatus();
  if (!pending) return null;
  return (
    <>
      <GlobalStyles />
      <div style={overlayStyle} aria-hidden>
        <div style={boxStyle}>
          <div style={spinnerStyle} />
          Salvando, aguarde...
        </div>
      </div>
    </>
  );
}

/** Envolve os campos e os desabilita enquanto pending = true */
export function PendingFieldset({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const { pending } = useFormStatus();
  return (
    <fieldset disabled={pending} style={style}>
      {children}
    </fieldset>
  );
}

/** Botão submit que troca o rótulo e bloqueia durante o pending */
export function SubmitButton({
  children,
  pendingText = 'Salvando...',
  style,
}: {
  children: React.ReactNode;
  pendingText?: string;
  style?: React.CSSProperties;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      style={{
        height: 36,
        padding: '0 14px',
        borderRadius: 8,
        border: '1px solid #111',
        background: '#111',
        color: '#fff',
        cursor: pending ? 'default' : 'pointer',
        opacity: pending ? 0.75 : 1,
        ...style,
      }}
    >
      {pending ? pendingText : children}
    </button>
  );
}
