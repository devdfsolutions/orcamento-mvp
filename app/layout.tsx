// app/layout.tsx
import "./globals.css";
import { ReactNode } from "react";
import Topbar from "./_topbar";

export const metadata = {
  title: "Gerador de Projetos",
  description: "Sistema de orçamentos e estimativas da DF Solutions",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const isAuthPage = typeof window !== "undefined" && window.location.pathname.startsWith("/login");

  return (
    <html lang="pt-BR">
      <body>
        {!isAuthPage && <Topbar />}
        <main className="min-h-screen bg-[#f7f7f8]">{children}</main>
      </body>
    </html>
  );
}
