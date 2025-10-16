export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100vh',          // ocupa a tela toda
        display: 'grid',
        placeItems: 'center',        // centraliza H e V
        background: '#f7f7f8',
        padding: 24,                 // respiro em telas menores
      }}
    >
      {children}
    </div>
  );
}
