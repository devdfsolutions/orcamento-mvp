import "./globals.css";
import { ReactNode } from "react";
import Topbar from "./_topbar";

export const metadata = {
  title: "Gerador de Projetos",
  description: "Sistema de orçamentos e estimativas da DF Solutions",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-[#f7f7f8] text-gray-900 min-h-screen">
        {/* Topbar fixa */}
        <Topbar />

        {/* Conteúdo principal com espaçamento abaixo da topbar */}
        <main className="pt-[70px] px-4 md:px-8">{children}</main>
      </body>
    </html>
  );
}
