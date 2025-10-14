'use client';
import { useEffect } from 'react';

export default function PrintButton({
  label = 'Imprimir / PDF',
  auto = false,
}: { label?: string; auto?: boolean }) {
  useEffect(() => {
    if (auto) window.print();
  }, [auto]);

  return (
    <button
      type="button"
      onClick={() => window.print()}
      style={{
        height: 36, padding: '0 12px', borderRadius: 8,
        border: '1px solid #ddd', background: '#111', color: '#fff',
        cursor: 'pointer'
      }}
    >
      {label}
    </button>
  );
}
