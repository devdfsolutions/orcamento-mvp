'use client';

import * as React from 'react';
import { useFormStatus } from 'react-dom';

/* ===================== estilos ===================== */
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

const GlobalStyles = () => (
  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
);

/* ===================== named exports ===================== */

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

/** Envolve inputs e os desabilita quando pending = true */
export function PendingFieldset({
  children,
  style,
  className,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <fieldset disabled={pending} style={style} className={className}>
      {children}
    </fieldset>
  );
}

/** Botão submit que troca rótulo enquanto pending = true */
export function SubmitButton({
  children,
  pendingText = 'Salvando...',
  style,
  className,
}: {
  children: React.ReactNode;
  pendingText?: string;
  style?: React.CSSProperties;
  className?: string;
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
      className={className}
    >
      {pending ? pendingText : children}
    </button>
  );
}

/* ===================== default export ===================== */

type FormPendingProps = {
  /** Server Action do formulário */
  action: (formData: FormData) => Promise<void>;
  /** Texto do botão */
  submitText?: string;
  /** Texto durante o pending */
  submittingText?: string;
  /** Estilos/classe do <form> */
  style?: React.CSSProperties;
  className?: string;
  /** Alinhamento do botão: 'start' | 'center' | 'end' */
  submitAlign?: 'start' | 'center' | 'end';
  /** Classe extra no botão */
  submitClassName?: string;
  /** Estilo extra no botão */
  submitStyle?: React.CSSProperties;
  children: React.ReactNode;
};

/**
 * Wrapper pronto pra usar:
 * <FormPending action={save} submitText="Salvar">
 *   ...inputs...
 * </FormPending>
 *
 * Renderiza:
 * - <form action=...>
 *   - <PendingOverlay/>
 *   - <PendingFieldset> {children} </PendingFieldset>
 *   - <SubmitButton>Salvar</SubmitButton>
 */
export default function FormPending({
  action,
  submitText = 'Salvar',
  submittingText = 'Salvando...',
  style,
  className,
  submitAlign = 'end',
  submitClassName,
  submitStyle,
  children,
}: FormPendingProps) {
  const justify =
    submitAlign === 'start' ? 'flex-start' : submitAlign === 'center' ? 'center' : 'flex-end';

  return (
    <form action={action} style={style} className={className}>
      <PendingOverlay />
      <PendingFieldset>{children}</PendingFieldset>

      <div style={{ display: 'flex', justifyContent: justify, marginTop: 8 }}>
        <SubmitButton pendingText={submittingText} className={submitClassName} style={submitStyle}>
          {submitText}
        </SubmitButton>
      </div>
    </form>
  );
}
