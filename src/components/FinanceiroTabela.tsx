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
      return { totalBase: base, totalAjustado: ajustado, deltaTotal: ajustado - base, totalComHonorarios: comHonor, lucroPrevisto: lucro };
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
    <div className="space-y-5 fin-block">
      {/* toolbar */}
      <div className="fin-toolbar flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => toggleAll(true)} className="px-2.5 py-1.5 rounded-md border bg-white text-sm">
          Selecionar todos
        </button>
        <button type="button" onClick={() => toggleAll(false)} className="px-2.5 py-1.5 rounded-md border bg-white text-sm">
          Limpar seleção
        </button>

        <div className="flex items-center gap-2 ml-4">
          <span className="text-xs text-neutral-600">Honorários (%)</span>
          <input
            className="fin-input-pct border rounded-md text-right text-xs leading-none"
            inputMode="decimal"
            placeholder="ex.: 10"
            value={honorariosPreview}
            onChange={(e) => setHonorariosPreview(e.currentTarget.value)}
          />
        </div>
      </div>

      {/* tabela */}
      <div className="overflow-x-auto rounded-lg border mt-2">
        <table className="min-w-full text-[13px] fin-table">
          <colgroup>
            <col className="col-sel" />
            <col className="col-item" />
            <col className="col-qtd" />
            <col className="col-unit" />
            <col className="col-sub" />
            <col className="col-ajuste" />
            <col className="col-obs" />
            <col className="col-ajustado" />
            <col className="col-delta" />
          </colgroup>

          <thead className="bg-neutral-50 text-xs">
            <tr>
              <th className="px-3 py-2 text-left has-sep">Sel.</th>
              <th className="px-3 py-2 text-left has-sep">Item</th>
              <th className="px-3 py-2 text-right has-sep">Qtd</th>
              <th className="px-3 py-2 text-right has-sep">Unit.</th>
              <th className="px-3 py-2 text-right has-sep">Subtotal</th>
              <th className="px-3 py-2 text-right has-sep">% Ajuste</th>
              <th className="px-3 py-2 text-left has-sep">Obs.</th>
              <th className="px-3 py-2 text-right has-sep">Ajustado</th>
              <th className="px-3 py-2 text-right">Δ</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => {
              const pct = r.percentual == null || r.percentual === '' ? null : Number(r.percentual);
              const base = toNum(r.subtotal, 0);
              const ajustado = pct == null || !Number.isFinite(pct) ? base : base * (1 + pct / 100);
              const delta = ajustado - base;

              return (
                <tr key={r.id} className="align-top">
                  <td className="px-3 py-2 cell has-sep">
                    <input
                      type="checkbox"
                      checked={r.checked}
                      onChange={(e) => update(r.id, 'checked', e.currentTarget.checked)}
                    />
                  </td>

                  <td className="px-3 py-2 cell has-sep">
                    <div className="font-medium truncate">{r.nome}</div>
                    <div className="text-[11px] text-neutral-500">
                      {r.tipo} {r.unidade ? `• ${r.unidade}` : ''}
                    </div>
                  </td>

                  <td className="px-3 py-2 cell text-right has-sep">{r.quantidade}</td>
                  <td className="px-3 py-2 cell text-right has-sep">{fmtBR(r.precoUnitario)}</td>
                  <td className="px-3 py-2 cell text-right has-sep">{fmtBR(base)}</td>

                  <td className="px-3 py-2 cell text-right has-sep">
                    <div className="flex justify-end">
                      <input
                        className="fin-input-pct border rounded-md text-right text-xs leading-none"
                        inputMode="decimal"
                        placeholder="%"
                        value={r.percentual ?? ''}
                        onChange={(e) => update(r.id, 'percentual', e.currentTarget.value)}
                      />
                    </div>
                  </td>

                  <td className="px-3 py-2 cell has-sep">
                    <input
                      className="fin-input-obs border rounded-md px-2 py-1 text-sm"
                      placeholder="Observação"
                      value={r.observacao ?? ''}
                      onChange={(e) => update(r.id, 'observacao', e.currentTarget.value)}
                    />
                  </td>

                  <td className="px-3 py-2 cell text-right has-sep">{fmtBR(ajustado)}</td>
                  <td className="px-3 py-2 cell text-right">{fmtBR(delta)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* espaço extra entre a tabela e os totais */}
      <div style={{ height: 10 }} />

      {/* totais */}
      <div className="fin-totais grid gap-2 text-sm">
        <div>Fornecedores (base): {fmtBR(totalBase)}</div>
        <div>
          Fornecedores (ajustado): {fmtBR(totalAjustado)} <span className="ml-1">Δ {fmtBR(deltaTotal)}</span>
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

      {/* CSS FORÇADO */}
      <style jsx>{`
        .fin-table {
          table-layout: fixed !important;
          border-collapse: separate !important;
          border-spacing: 0 !important;
          width: 100% !important;
        }
        /* larguras das colunas (forçadas) */
        .fin-table col.col-sel { width: 52px !important; }
        .fin-table col.col-item { width: 340px !important; }
        .fin-table col.col-qtd { width: 66px !important; }
        .fin-table col.col-unit { width: 64px !important; }
        .fin-table col.col-sub { width: 110px !important; }
        .fin-table col.col-ajuste { width: 90px !important; }
        .fin-table col.col-obs { width: 240px !important; }
        .fin-table col.col-ajustado { width: 120px !important; }
        .fin-table col.col-delta { width: 90px !important; }

        /* linhas e separadores */
        .fin-table thead th { border-top: 0 !important; }
        .cell { border-top: 1px solid #e5e7eb !important; }
        .has-sep { border-right: 1px solid rgba(0,0,0,.08) !important; }

        /* inputs */
        .fin-input-pct {
          width: 42px !important;
          min-width: 42px !important;
          height: 24px !important;
          padding: 0 4px !important;
        }
        .fin-input-obs {
          width: 100% !important;
          min-width: 0 !important;
        }

        /* respiros */
        .fin-toolbar { margin-bottom: 10px !important; }
        .fin-totais { margin-top: 4px !important; }
      `}</style>
    </div>
  );
}
