// app/layout.tsx
import "./globals.css";
import Topbar from "./_topbar";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0 }}>
        <Topbar />
        <main
          style={{
            padding: 24,
            paddingTop: 56, // espaço da topbar
            display: "grid",
            gap: 16,
            maxWidth: 1100,
            margin: "0 auto",
          }}
        >
          {children}
        </main>
      </body>
    </html>
  );
}
