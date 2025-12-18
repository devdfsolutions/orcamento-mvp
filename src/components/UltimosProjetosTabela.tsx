"use client";

import Link from "next/link";
import type React from "react";

type Projeto = {
  id: number;
  nome: string;
  status: string;
  totalAprov: number;
  cliente?: { nome: string } | null;
};

const th: React.CSSProperties = {
  textAlign: "left",
  padding: 10,
  borderBottom: "1px solid #eee",
  fontWeight: 600,
};

const td: React.CSSProperties = {
  padding: 10,
  borderBottom: "1px solid #f2f2f2",
};

const linkBtn: React.CSSProperties = {
  display: "inline-block",
  padding: "6px 10px",
  border: "1px solid #ddd",
  borderRadius: 8,
  background: "#f8f8f8",
  textDecoration: "none",
  color: "#111",
};

export default function UltimosProjetosTabela({ projetos }: { projetos: Projeto[] }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
      <thead>
        <tr style={{ background: "#f6f6f6" }}>
          <th style={th}>ID</th>
          <th style={th}>Projeto</th>
          <th style={th}>Cliente</th>
          <th style={th}>Status</th>
          <th style={{ ...th, textAlign: "right" }}>Total aprovado</th>
          <th style={th}></th>
        </tr>
      </thead>

      <tbody>
        {projetos.map((p) => (
          <tr key={p.id}>
            <td style={td}>{p.id}</td>
            <td style={td}>{p.nome}</td>
            <td style={td}>{p.cliente?.nome ?? "—"}</td>
            <td style={td}>{statusLabel(p.status)}</td>
            <td style={{ ...td, textAlign: "right" }}>
              {p.totalAprov
                ? p.totalAprov.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })
                : "—"}
            </td>
            <td style={{ ...td, textAlign: "right" }}>
              <Link href={`/projetos/${p.id}/itens`} style={linkBtn}>
                Abrir
              </Link>
            </td>
          </tr>
        ))}

        {projetos.length === 0 && (
          <tr>
            <td style={td} colSpan={6}>
              Nenhum projeto ainda.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function statusLabel(s: string) {
  switch (s) {
    case "rascunho":
      return "Rascunho";
    case "com_estimativa":
      return "Em estimativa";
    case "aprovado":
      return "Aprovado";
    case "execucao":
      return "Execução";
    case "concluido":
      return "Concluído";
    default:
      return s;
  }
}
