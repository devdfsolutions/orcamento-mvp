'use client';

import * as React from 'react';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  action: (formData: FormData) => Promise<void> | void; // server action
  children: React.ReactNode;
  submitText?: string;
  submittingText?: string;
};

export default function FormPending({
  action,
  children,
  submitText = 'Salvar',
  submittingText = 'Salvando...',
}: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await action(fd);
      router.refresh();
    });
  };

  return (
    <div style={{ position: 'relative' }}>
      {isPending && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(255,255,255,.7)',
            backdropFilter: 'blur(2px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 8,
            zIndex: 10,
          }}
        >
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              border: '4px solid #e5e7eb',
              borderTopColor: '#111',
              animation: 'spin .9s linear infinite',
            }}
          />
          <span style={{ marginLeft: 10, fontWeight: 600 }}>{submittingText}</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
        {children}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            disabled={isPending}
            style={{
              height: 36,
              padding: '0 16px',
              borderRadius: 8,
              border: '1px solid #111',
              background: '#111',
              color: '#fff',
              cursor: isPending ? 'not-allowed' : 'pointer',
              opacity: isPending ? 0.85 : 1,
            }}
          >
            {isPending ? submittingText : submitText}
          </button>
        </div>
      </form>
    </div>
  );
}
