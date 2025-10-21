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
  ajuste?: {
    percentual?: number | null;
    valorFixo?: number | null;
    observacao?: string | null;
  } | null;
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

  function toggleAll(checked: boolean) {
    setRows((prev) => prev.map((r) => ({ ...r, checked })));
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
              <th className="px-3 py-2 text-left">
                <input
                  type="checkbox"
                  onChange={(e) => toggleAll(e.currentTarget.checked)}
                  aria-label="Selecionar todos"
                />
              </th>
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
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={r.checked}
                    onChange={(e) => update(r.id, "checked", e.currentTarget.checked)}
                    aria-label={`Selecionar item ${r.nome}`}
                  />
                </td>

                <td className="px-3 py-2">
                  <div className="font-medium">{r.nome}</div>
                  <div className="text-xs text-neutral-500">
                    {r.tipo} {r.unidade ? `• ${r.unidade}` : ""}
                  </div>
                </td>

                <td className="px-3 py-2 text-right">{r.quantidade}</td>
                <td className="px-3 py-2 text-right">
                  {r.precoUnitario.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </td>
                <td className="px-3 py-2 text-right">
                  {r.subtotal.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </td>

                <td className="px-3 py-2 text-right">
                  <input
                    className="w-24 border rounded-md px-2 py-1 text-right"
                    inputMode="decimal"
                    placeholder="%"
                    value={r.percentual ?? ""}
                    onChange={(e) => update(r.id, "percentual", e.currentTarget.value)}
                    title="Informe porcentagem positiva ou negativa (ex.: 10 ou -5)"
                  />
                </td>

                <td className="px-3 py-2 text-right">
                  <input
                    className="w-28 border rounded-md px-2 py-1 text-right"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={r.valorFixo ?? ""}
                    onChange={(e) => update(r.id, "valorFixo", e.currentTarget.value)}
                    title="Valor final (R$) a aplicar sobre este item, ignorando o percentual"
                  />
                </td>

                <td className="px-3 py-2">
                  <label className="inline-flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={r.aplicarEmSimilares}
                      onChange={(e) =>
                        update(r.id, "aplicarEmSimilares", e.currentTarget.checked)
                      }
                    />
                    aplicar em similares
                  </label>
                  {r.grupoSimilar ? (
                    <div className="text-[11px] text-neutral-500 mt-1">
                      grupo: {r.grupoSimilar}
                    </div>
                  ) : null}
                </td>

                <td className="px-3 py-2">
                  <input
                    className="w-56 border rounded-md px-2 py-1"
                    placeholder="Observação"
                    value={r.observacao ?? ""}
                    onChange={(e) => update(r.id, "observacao", e.currentTarget.value)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end gap-8">
        <div className="text-xs text-neutral-500">
          Dica: marque os itens, preencha % ou R$, e clique em <b>Salvar ajustes</b>. Se marcar
          “aplicar em similares”, os itens com o mesmo nome serão ajustados juntos.
        </div>
        <button
          onClick={salvarAjustesSelecionados}
          className="px-4 py-2 rounded-lg border border-neutral-900 bg-neutral-900 text-white font-semibold"
          title="Cria registros em FinanceiroAjuste sem alterar a estimativa original"
        >
          Salvar ajustes
        </button>
      </div>
    </div>
  );
}
