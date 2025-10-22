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

  const { totalBase, totalAjustado, deltaTotal, totalComHonorarios, lucroPrevisto } = useMemo(() => {
    const base = rows.reduce((acc, r) => acc + toNum(r.subtotal, 0), 0);
    const ajustado = rows.reduce((acc, r) => {
      const pct = r.percentual == null || r.percentual === '' ? null : Number(r.percentual);
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
        percentual:
          r.percentual == null || r.percentual === '' ? null : Number(r.percentual),
        valorFixo: null,
        observacao: r.observacao?.trim() || null,
        aplicarEmSimilares: false,
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
    <div className="space-y-4">
      {/* Toolbar */}
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
            style={{ width: '42px', minWidth: '42px', height: '24px', padding: '0 4px' }}
            inputMode="decimal"
            placeholder="ex.: 10"
            value={honorariosPreview}
            onChange={(e) => setHonorariosPreview(e.currentTarget.value)}
          />
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto rounded-lg border mt-4">
        <table className="min-w-full text-[13px] border-collapse border-spacing-0">
          <colgroup>
            <col style={{ width: '40px' }} />   {/* Sel */}
            <col style={{ width: '280px' }} />  {/* Item */}
            <col style={{ width: '60px' }} />   {/* Qtd */}
            <col style={{ width: '90px' }} />   {/* Unit */}
            <col style={{ width: '110px' }} />  {/* Subtotal */}
            <col style={{ width: '70px' }} />   {/* % Ajuste */}
            <col style={{ width: '220px' }} />  {/* Obs */}
            <col style={{ width: '110px' }} />  {/* Ajustado */}
            <col style={{ width: '70px' }} />   {/* Δ */}
          </colgroup>

          <thead className="bg-neutral-50 text-xs text-neutral-700 border-b border-neutral-200">
            <tr>
              <th className="px-3 py-2 text-left border-x border-neutral-100">Sel.</th>
              <th className="px-3 py-2 text-left border-x border-neutral-100">Item</th>
              <th className="px-3 py-2 text-right border-x border-neutral-100">Qtd</th>
              <th className="px-3 py-2 text-right border-x border-neutral-100">Unit.</th>
              <th className="px-3 py-2 text-right border-x border-neutral-100">Subtotal</th>
              <th className="px-3 py-2 text-right border-x border-neutral-100">% Ajuste</th>
              <th className="px-3 py-2 text-left border-x border-neutral-100">Obs.</th>
              <th className="px-3 py-2 text-right border-x border-neutral-100">Ajustado</th>
              <th className="px-3 py-2 text-right border-x border-neutral-100">Δ</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => {
              const pct = r.percentual == null || r.percentual === '' ? null : Number(r.percentual);
              const base = toNum(r.subtotal, 0);
              const ajustado = pct == null || !Number.isFinite(pct) ? base : base * (1 + pct / 100);
              const delta = ajustado - base;

              return (
                <tr key={r.id} className="border-t border-neutral-200 align-top hover:bg-neutral-50">
                  <td className="px-3 py-2 text-center border-x border-neutral-100">
                    <input
                      type="checkbox"
                      checked={r.checked}
                      onChange={(e) => update(r.id, 'checked', e.currentTarget.checked)}
                    />
                  </td>

                  <td className="px-3 py-2 border-x border-neutral-100">
                    <div className="font-medium">{r.nome}</div>
                    <div className="text-[11px] text-neutral-500">
                      {r.tipo} {r.unidade ? `• ${r.unidade}` : ''}
                    </div>
                  </td>

                  <td className="px-3 py-2 text-right border-x border-neutral-100">{r.quantidade}</td>
                  <td className="px-3 py-2 text-right border-x border-neutral-100">{fmtBR(r.precoUnitario)}</td>
                  <td className="px-3 py-2 text-right border-x border-neutral-100">{fmtBR(base)}</td>

                  {/* % Ajuste */}
                  <td className="px-3 py-2 text-right border-x border-neutral-100">
                    <input
                      className="border rounded-md text-right text-xs leading-none"
                      style={{
                        width: '38px',
                        minWidth: '38px',
                        height: '24px',
                        padding: '0 4px',
                      }}
                      inputMode="decimal"
                      placeholder="%"
                      value={r.percentual ?? ''}
                      onChange={(e) => update(r.id, 'percentual', e.currentTarget.value)}
                    />
                  </td>

                  {/* Obs */}
                  <td className="px-3 py-2 border-x border-neutral-100">
                    <input
                      className="border rounded-md px-2 py-1 text-sm w-full"
                      placeholder="Observação"
                      value={r.observacao ?? ''}
                      onChange={(e) => update(r.id, 'observacao', e.currentTarget.value)}
                    />
                  </td>

                  <td className="px-3 py-2 text-right border-x border-neutral-100">{fmtBR(ajustado)}</td>
                  <td className="px-3 py-2 text-right border-x border-neutral-100">{fmtBR(delta)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Espaço extra abaixo da tabela */}
      <div className="h-3" />

      {/* Totais + botão */}
      <div className="grid gap-2 text-sm mt-3 pt-1 border-t border-neutral-200">
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
