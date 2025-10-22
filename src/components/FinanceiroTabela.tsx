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

export default function FinanceiroTabela(props: {
  projetoId: number;
  usuarioId: number;
  itens: Item[];
  recebemos: number;
}) {
  const [rows, setRows] = useState(
    props.itens.map((it) => ({
      ...it,
      checked: false,
      percentual: it.ajuste?.percentual ?? null,
      observacao: it.ajuste?.observacao ?? '',
    }))
  );

  const [honorariosPreview, setHonorariosPreview] = useState<string>('');

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
      const lucro = toNum(props.recebemos, 0) - comHonor;

      return {
        totalBase: base,
        totalAjustado: ajustado,
        deltaTotal: ajustado - base,
        totalComHonorarios: comHonor,
        lucroPrevisto: lucro,
      };
    }, [rows, honorariosPreview, props.recebemos]);

  function update<K extends keyof (typeof rows)[number]>(id: number, key: K, val: any) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [key]: val } : r)));
  }

  function toggleAll(checked: boolean) {
    setRows((prev) => prev.map((r) => ({ ...r, checked })));
  }

  async function salvarTudo() {
    const itensPayload = rows
      .filter((r) => r.checked)
      .map((r) => ({
        estimativaItemId: r.id,
        percentual: r.percentual == null || r.percentual === '' ? null : Number(r.percentual),
        valorFixo: null, // removido da UI
        observacao: r.observacao?.trim() || null,
        aplicarEmSimilares: false, // removido da UI
        grupoSimilar: null,
      }));

    if (itensPayload.length > 0) {
      await upsertAjustesFinanceiros({
        projetoId: props.projetoId,
        usuarioId: props.usuarioId,
        itens: itensPayload,
      });
    }

    const p = Number(String(honorariosPreview).replace(',', '.'));
    if (Number.isFinite(p)) {
      await aplicarHonorariosDirect({
        projetoId: props.projetoId,
        usuarioId: props.usuarioId,
        percentual: p,
      });
    }
  }

  return (
    <div className="space-y-5">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => toggleAll(true)}
          className="px-2.5 py-1.5 rounded-md border bg-white text-sm"
        >
          Selecionar todos
        </button>
        <button
          type="button"
          onClick={() => toggleAll(false)}
          className="px-2.5 py-1.5 rounded-md border bg-white text-sm"
        >
          Limpar seleção
        </button>

        <div className="flex items-center gap-2 ml-4">
          <span className="text-xs text-neutral-600">Honorários (%)</span>
          <input
            className="border rounded-md text-right text-xs leading-none"
            style={{ width: 42, minWidth: 42, height: 24, padding: '0 4px' }}
            inputMode="decimal"
            placeholder="ex.: 10"
            value={honorariosPreview}
            onChange={(e) => setHonorariosPreview(e.currentTarget.value)}
          />
        </div>
      </div>

      {/* TABELA */}
      <div className="overflow-x-auto rounded-lg border mt-2">
        <table
          className="min-w-full text-[13px]"
          style={{ tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: 0 }}
        >
          {/* Larguras fixas para cada coluna */}
          <colgroup>
            <col style={{ width: 52 }} />   {/* Sel. */}
            <col style={{ width: 340 }} />  {/* Item */}
            <col style={{ width: 66 }} />   {/* Qtd */}
            <col style={{ width: 64 }} />   {/* Unit. */}
            <col style={{ width: 110 }} />  {/* Subtotal */}
            <col style={{ width: 90 }} />   {/* % Ajuste */}
            <col style={{ width: 240 }} />  {/* Obs. */}
            <col style={{ width: 120 }} />  {/* Ajustado */}
            <col style={{ width: 90 }} />   {/* Δ */}
          </colgroup>

          <thead className="bg-neutral-50 text-xs">
            <tr>
              <th className="px-3 py-2 text-left border-r border-neutral-200">Sel.</th>
              <th className="px-3 py-2 text-left border-r border-neutral-200">Item</th>
              <th className="px-3 py-2 text-right border-r border-neutral-200">Qtd</th>
              <th className="px-3 py-2 text-right border-r border-neutral-200">Unit.</th>
              <th className="px-3 py-2 text-right border-r border-neutral-200">Subtotal</th>
              <th className="px-3 py-2 text-right border-r border-neutral-200">% Ajuste</th>
              <th className="px-3 py-2 text-left border-r border-neutral-200">Obs.</th>
              <th className="px-3 py-2 text-right border-r border-neutral-200">Ajustado</th>
              <th className="px-3 py-2 text-right">Δ</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r, idx) => {
              const pct =
                r.percentual == null || r.percentual === '' ? null : Number(r.percentual);
              const base = toNum(r.subtotal, 0);
              const ajustado = pct == null || !Number.isFinite(pct) ? base : base * (1 + pct / 100);
              const delta = ajustado - base;

              return (
                <tr key={r.id} className="align-top">
                  <td className="px-3 py-2 border-t border-neutral-200 border-r">
                    <input
                      type="checkbox"
                      checked={r.checked}
                      onChange={(e) => update(r.id, 'checked', e.currentTarget.checked)}
                    />
                  </td>

                  <td className="px-3 py-2 border-t border-neutral-200 border-r">
                    <div className="font-medium truncate">{r.nome}</div>
                    <div className="text-[11px] text-neutral-500">
                      {r.tipo} {r.unidade ? `• ${r.unidade}` : ''}
                    </div>
                  </td>

                  <td className="px-3 py-2 text-right border-t border-neutral-200 border-r">
                    {r.quantidade}
                  </td>
                  <td className="px-3 py-2 text-right border-t border-neutral-200 border-r">
                    {fmtBR(r.precoUnitario)}
                  </td>
                  <td className="px-3 py-2 text-right border-t border-neutral-200 border-r">
                    {fmtBR(base)}
                  </td>

                  {/* % Ajuste (input estreito e travado) */}
                  <td className="px-3 py-2 text-right border-t border-neutral-200 border-r">
                    <div className="flex justify-end">
                      <input
                        className="border rounded-md text-right text-xs leading-none"
                        style={{ width: 42, minWidth: 42, height: 24, padding: '0 4px' }}
                        inputMode="decimal"
                        placeholder="%"
                        value={r.percentual ?? ''}
                        onChange={(e) => update(r.id, 'percentual', e.currentTarget.value)}
                      />
                    </div>
                  </td>

                  {/* Observações */}
                  <td className="px-3 py-2 border-t border-neutral-200 border-r">
                    <input
                      className="border rounded-md px-2 py-1 text-sm w-full"
                      placeholder="Observação"
                      value={r.observacao ?? ''}
                      onChange={(e) => update(r.id, 'observacao', e.currentTarget.value)}
                    />
                  </td>

                  <td className="px-3 py-2 text-right border-t border-neutral-200 border-r">
                    {fmtBR(ajustado)}
                  </td>
                  <td className="px-3 py-2 text-right border-t border-neutral-200">
                    {fmtBR(delta)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* respirinho entre tabela e totais */}
      <div className="h-2" />

      {/* Totais + botão */}
      <div className="grid gap-2 text-sm">
        <div>Fornecedores (base): {fmtBR(totalBase)}</div>
        <div>
          Fornecedores (ajustado): {fmtBR(totalAjustado)}{' '}
          <span className="ml-1">Δ {fmtBR(deltaTotal)}</span>
        </div>
        <div>
          Com honorários (prévia):{' '}
          {Number.isFinite(Number(String(honorariosPreview).replace(',', '.')))
            ? fmtBR(totalComHonorarios)
            : fmtBR(totalAjustado)}
        </div>
        <div className="font-semibold">Lucro previsto: {fmtBR(lucroPrevisto)}</div>

        <div className="mt-2">
          <button
            onClick={salvarTudo}
            className="px-4 py-2 rounded-lg border border-neutral-900 bg-neutral-900 text-white font-semibold"
          >
            Salvar ajustes
          </button>
        </div>
      </div>
    </div>
  );
}
