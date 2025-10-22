// src/components/FinanceiroTabela.tsx
'use client';

import { useMemo, useState } from 'react';
import {
  upsertAjustesFinanceiros,
  aplicarHonorariosDirect,
} from '@/actions/financeiro';

type Item = {
  id: number;
  tipo: 'PRODUTO' | 'SERVICO';
  nome: string;
  quantidade: number;
  unidade?: string | null;
  precoUnitario: number;
  subtotal: number;
  ajuste?: {
    percentual?: number | null;
    observacao?: string | null;
  } | null;
};

function toNum(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function fmtBR(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function FinanceiroTabela({
  projetoId,
  usuarioId,
  itens,
  recebemos,
}: {
  projetoId: number;
  usuarioId: number;
  itens: Item[];
  recebemos: number;
}) {
  const [rows, setRows] = useState(
    itens.map((it) => ({
      ...it,
      checked: false,
      percentual: it.ajuste?.percentual ?? null,
      observacao: it.ajuste?.observacao ?? '',
    }))
  );
  const [honorariosPreview, setHonorariosPreview] = useState('');

  const { totalBase, totalAjustado, deltaTotal, totalComHonorarios, lucroPrevisto } =
    useMemo(() => {
      const base = rows.reduce((acc, r) => acc + toNum(r.subtotal, 0), 0);
      const ajustado = rows.reduce((acc, r) => {
        const pct =
          r.percentual == null || r.percentual === '' ? null : Number(r.percentual);
        if (pct == null || !Number.isFinite(pct)) return acc + toNum(r.subtotal, 0);
        const novo = toNum(r.subtotal, 0) * (1 + pct / 100);
        return acc + novo;
      }, 0);
      const p = Number(String(honorariosPreview).replace(',', '.'));
      const temHonor = Number.isFinite(p);
      const comHonor = temHonor ? ajustado * (1 + p / 100) : ajustado;
      const lucro = toNum(recebemos, 0) - comHonor;
      return {
        totalBase: base,
        totalAjustado: ajustado,
        deltaTotal: ajustado - base,
        totalComHonorarios: comHonor,
        lucroPrevisto: lucro,
      };
    }, [rows, honorariosPreview, recebemos]);

  async function salvarTudo() {
    const itensPayload = rows
      .filter((r) => r.checked)
      .map((r) => ({
        estimativaItemId: r.id,
        percentual:
          r.percentual == null || r.percentual === '' ? null : Number(r.percentual),
        valorFixo: null,
        observacao: r.observacao?.trim() || null,
        aplicarEmSimilares: false,
        grupoSimilar: null,
      }));

    if (itensPayload.length > 0) {
      await upsertAjustesFinanceiros({
        projetoId,
        usuarioId,
        itens: itensPayload,
      });
    }

    const p = Number(String(honorariosPreview).replace(',', '.'));
    if (Number.isFinite(p)) {
      await aplicarHonorariosDirect({
        projetoId,
        usuarioId,
        percentual: p,
      });
    }
  }

  return (
    <div className="space-y-5">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setRows((p) => p.map((r) => ({ ...r, checked: true })))}
          className="px-2.5 py-1.5 rounded-md border bg-white text-sm"
        >
          Selecionar todos
        </button>
        <button
          onClick={() => setRows((p) => p.map((r) => ({ ...r, checked: false })))}
          className="px-2.5 py-1.5 rounded-md border bg-white text-sm"
        >
          Limpar seleção
        </button>

        <div className="flex items-center gap-2 ml-4">
          <span className="text-xs text-neutral-600">Honorários (%)</span>
          <input
            className="border rounded-md text-right text-xs leading-none"
            style={{ width: 42, height: 24, padding: '0 4px' }}
            inputMode="decimal"
            placeholder="ex.: 10"
            value={honorariosPreview}
            onChange={(e) => setHonorariosPreview(e.target.value)}
          />
        </div>
      </div>

      {/* tabela */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 mt-4">
        <table
          className="min-w-full text-[13px] border-collapse"
          style={{ borderSpacing: 0 }}
        >
          <thead className="bg-neutral-50 text-xs text-neutral-700">
            <tr className="border-b border-gray-200">
              <th className="px-3 py-2 text-left border-r border-gray-200">Sel.</th>
              <th className="px-3 py-2 text-left border-r border-gray-200 w-[280px]">
                Item
              </th>
              <th className="px-3 py-2 text-right border-r border-gray-200 w-[70px]">
                Qtd
              </th>
              <th className="px-3 py-2 text-right border-r border-gray-200 w-[90px]">
                Unit.
              </th>
              <th className="px-3 py-2 text-right border-r border-gray-200 w-[110px]">
                Subtotal
              </th>
              <th className="px-3 py-2 text-right border-r border-gray-200 w-[80px]">
                % Ajuste
              </th>
              <th className="px-3 py-2 text-left border-r border-gray-200 w-[220px]">
                Obs.
              </th>
              <th className="px-3 py-2 text-right border-r border-gray-200 w-[110px]">
                Ajustado
              </th>
              <th className="px-3 py-2 text-right w-[70px]">Δ</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => {
              const pct =
                r.percentual == null || r.percentual === ''
                  ? null
                  : Number(r.percentual);
              const base = toNum(r.subtotal, 0);
              const ajustado =
                pct == null || !Number.isFinite(pct) ? base : base * (1 + pct / 100);
              const delta = ajustado - base;
              return (
                <tr
                  key={r.id}
                  className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-3 py-2 text-center border-r border-gray-200">
                    <input
                      type="checkbox"
                      checked={r.checked}
                      onChange={(e) =>
                        setRows((p) =>
                          p.map((x) =>
                            x.id === r.id ? { ...x, checked: e.target.checked } : x
                          )
                        )
                      }
                    />
                  </td>
                  <td className="px-3 py-2 border-r border-gray-200">
                    <div className="font-medium">{r.nome}</div>
                    <div className="text-[11px] text-neutral-500">
                      {r.tipo} {r.unidade ? `• ${r.unidade}` : ''}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right border-r border-gray-200">
                    {r.quantidade}
                  </td>
                  <td className="px-3 py-2 text-right border-r border-gray-200">
                    {fmtBR(r.precoUnitario)}
                  </td>
                  <td className="px-3 py-2 text-right border-r border-gray-200">
                    {fmtBR(base)}
                  </td>
                  <td className="px-3 py-2 text-right border-r border-gray-200">
                    <input
                      className="border rounded-md text-right text-xs leading-none"
                      style={{ width: 38, height: 22, padding: '0 4px' }}
                      inputMode="decimal"
                      placeholder="%"
                      value={r.percentual ?? ''}
                      onChange={(e) =>
                        setRows((p) =>
                          p.map((x) =>
                            x.id === r.id
                              ? { ...x, percentual: e.target.value }
                              : x
                          )
                        )
                      }
                    />
                  </td>
                  <td className="px-3 py-2 border-r border-gray-200">
                    <input
                      className="border rounded-md px-2 py-1 text-sm w-full"
                      placeholder="Observação"
                      value={r.observacao ?? ''}
                      onChange={(e) =>
                        setRows((p) =>
                          p.map((x) =>
                            x.id === r.id
                              ? { ...x, observacao: e.target.value }
                              : x
                          )
                        )
                      }
                    />
                  </td>
                  <td className="px-3 py-2 text-right border-r border-gray-200">
                    {fmtBR(ajustado)}
                  </td>
                  <td className="px-3 py-2 text-right">{fmtBR(delta)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* espaçamento e divisória */}
      <div className="mt-6 border-t border-gray-300 pt-3" />

      {/* totais */}
      <div className="grid gap-1 text-sm">
        <div>Fornecedores (base): {fmtBR(totalBase)}</div>
        <div>
          Fornecedores (ajustado): {fmtBR(totalAjustado)}{' '}
          <span className="ml-1 text-neutral-500">Δ {fmtBR(deltaTotal)}</span>
        </div>
        <div>
          Com honorários (prévia):{' '}
          {Number.isFinite(Number(String(honorariosPreview).replace(',', '.')))
            ? fmtBR(totalComHonorarios)
            : fmtBR(totalAjustado)}
        </div>
        <div className="font-semibold">
          Lucro previsto: {fmtBR(lucroPrevisto)}
        </div>
        <button
          onClick={salvarTudo}
          className="mt-2 px-4 py-2 rounded-lg border border-neutral-900 bg-neutral-900 text-white font-semibold w-fit"
        >
          Salvar ajustes
        </button>
      </div>
    </div>
  );
}
