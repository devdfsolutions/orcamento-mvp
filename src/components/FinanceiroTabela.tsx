// src/components/FinanceiroTabela.tsx
"use client";

import { useState } from "react";
import { upsertAjustesFinanceiros } from "@/actions/financeiro";

type Item = {
  id: number;
  tipo: "PRODUTO" | "SERVICO";
  nome: string;
  quantidade: number;
  unidade?: string | null;
  precoUnitario: number;
  subtotal: number;
  ajuste?: { percentual?: number | null; valorFixo?: number | null; observacao?: string | null } | null;
  grupoSimilar?: string | null;
};

export default function FinanceiroTabela(props: {
  projetoId: number;
  usuarioId: number;
  itens: Item[];
}) {
  const [rows, setRows] = useState(
    props.itens.map((it) => ({
      ...it,
      checked: false,
      percentual: it.ajuste?.percentual ?? null,
      valorFixo: it.ajuste?.valorFixo ?? null,
      observacao: it.ajuste?.observacao ?? "",
      aplicarEmSimilares: false,
    }))
  );

  function update<K extends keyof (typeof rows)[number]>(id: number, key: K, val: any) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [key]: val } : r)));
  }

  async function salvarAjustesSelecionados() {
    const payload = rows
      .filter((r) => r.checked)
      .map((r) => ({
        estimativaItemId: r.id,
        percentual: r.percentual == null || r.percentual === "" ? null : Number(r.percentual),
        valorFixo: r.valorFixo == null || r.valorFixo === "" ? null : Number(r.valorFixo),
        observacao: r.observacao?.trim() || null,
        aplicarEmSimilares: !!r.aplicarEmSimilares,
        grupoSimilar: r.grupoSimilar ?? null,
      }));

    if (payload.length === 0) return;

    await upsertAjustesFinanceiros({
      projetoId: props.projetoId,
      usuarioId: props.usuarioId,
      itens: payload,
    });
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50 text-xs">
            <tr>
              <th className="px-3 py-2 text-left">Sel.</th>
              <th className="px-3 py-2 text-left">Item</th>
              <th className="px-3 py-2 text-right">Qtd</th>
              <th className="px-3 py-2 text-right">Unit.</th>
              <th className="px-3 py-2 text-right">Subtotal</th>
              <th className="px-3 py-2 text-right">% Ajuste</th>
              <th className="px-3 py-2 text-right">Valor Fixo (R$)</th>
              <th className="px-3 py-2">Similares</th>
              <th className="px-3 py-2">Obs.</th>
            </tr>
          </thead>
          <tbody>
