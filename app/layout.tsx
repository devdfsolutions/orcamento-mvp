import type { Metadata } from 'next';
import Topbar from './_topbar';
import Sidebar from '@/components/Sidebar';
import './globals.css';

export const metadata: Metadata = {
  title: 'Gerador de projetos',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br">
      <body style={{ margin: 0, background: '#fafafa', color: '#111' }}>
        <Topbar />
        <div style={{ display: 'flex', minHeight: 'calc(100dvh - 56px)' }}>
          <Sidebar />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ maxWidth: 1100, margin: '0 auto', padding: 16 }}>
              {children}
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
