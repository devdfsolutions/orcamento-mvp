'use client';

import * as React from 'react';
import { useTransition } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';

type Props = {
  /** ID que será enviado para o server action como "id" */
  id: number;
  /** Texto de contexto do item (ex.: "Parafuso 3/4 — Fornecedor ABC") */
  label: string;
  /** Server action de exclusão (excluirVinculo). Recebe FormData com "id" */
  onDelete: (formData: FormData) => Promise<void> | void;
  /** (Opcional) rótulo do botão principal */
  buttonText?: string;
  /** (Opcional) estilos inline para o botão "Excluir" (fica igual aos seus danger buttons) */
  style?: React.CSSProperties;
};

export default function ConfirmDelete({
  id,
  label,
  onDelete,
  buttonText = 'Excluir',
  style,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const onConfirm = () => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('id', String(id));
      await onDelete(fd);
      // quando o server action redireciona para a própria página, o replace da URL já acontece.
      // esse refresh garante repaint local quando não houver redirect.
      router.refresh();
      setOpen(false);
    });
  };

  return (
    <>
      {/* Botão que abre o modal */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          height: 30,
          padding: '0 10px',
          borderRadius: 8,
          border: '1px solid #f1d0d0',
          background: '#ffeaea',
          color: '#b40000',
          cursor: 'pointer',
          ...style,
        }}
      >
        {buttonText}
      </button>

      {/* Modal (portal) */}
      {open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: 16,
            }}
            onClick={() => !isPending && setOpen(false)}
          >
            <div
              style={{
                width: 'min(520px, 96vw)',
                background: '#fff',
                borderRadius: 12,
                boxShadow: '0 10px 30px rgba(0,0,0,.2)',
                padding: 16,
                border: '1px solid #eee',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'grid', gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Confirmar exclusão</h3>
                <p style={{ margin: 0, color: '#444' }}>
                  Tem certeza que deseja excluir o vínculo:
                  <br />
                  <b>{label}</b>?
                </p>
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={isPending}
                  style={{
                    height: 34,
                    padding: '0 12px',
                    borderRadius: 8,
                    border: '1px solid #ddd',
                    background: '#f8f8f8',
                    cursor: isPending ? 'not-allowed' : 'pointer',
                  }}
                >
                  Não
                </button>

                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={isPending}
                  style={{
                    height: 34,
                    padding: '0 14px',
                    borderRadius: 8,
                    border: '1px solid #b40000',
                    background: '#b40000',
                    color: '#fff',
                    cursor: isPending ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  {isPending && (
                    <span
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        border: '2px solid #ffd0d0',
                        borderTopColor: '#fff',
                        display: 'inline-block',
                        animation: 'spin .9s linear infinite',
                      }}
                    />
                  )}
                  {isPending ? 'Excluindo...' : 'Sim, excluir'}
                </button>
              </div>

              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
