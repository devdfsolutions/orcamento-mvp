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
    // valorFixo removido da UI; mantemos null ao salvar:
    valorFixo?: number | null;
    observacao?: string | null;
  } | null;
  grupoSimilar?: string | null;
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
  recebemos: number; // usado pra prévia do lucro
}) {
  const [rows, setRows] = useState(
    props.itens.map((it) => ({
      ...it,
      checked: false,
      percentual: it.ajuste?.percentual ?? null,
      // coluna de valor fixo foi removida — manteremos sempre null:
      valorFixo: null as number | null,
      observacao: it.ajuste?.observacao ?? '',
      aplicarEmSimilares: false,
    }))
  );

  // único campo de honorários na toolbar
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
    // 1) salva ajustes por item (apenas os selecionados)
    const itensPayload = rows
      .filter((r) => r.checked)
      .map((r) => ({
        estimativaItemId: r.id,
        percentual:
          r.percentual == null || r.percentual === '' ? null : Number(r.percentual),
        // coluna removida → mantemos null
        valorFixo: null as number | null,
        observacao: r.observacao?.trim() || null,
        aplicarEmSimilares: !!r.aplicarEmSimilares,
        grupoSimilar: r.grupoSimilar ?? null,
      }));

    if (itensPayload.length > 0) {
      await upsertAjustesFinanceiros({
        projetoId: props.projetoId,
        usuarioId: props.usuarioId,
        itens: itensPayload,
      });
    }

    // 2) aplica honorários (se houver valor válido)
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
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => toggleAll(true)}
          className="px-2.5 py-1.5 rounded-md border bg-white text-sm"
          title="Selecionar todos os itens"
        >
          Selecionar todos
        </button>
        <button
          type="button"
          onClick={() => toggleAll(false)}
          className="px-2.5 py-1.5 rounded-md border bg-white text-sm"
          title="Limpar seleção"
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
            title="Use valores positivos (ex.: 10 = +10%)"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border mt-3">
        <table className="min-w-full text-[13px]">
          {/* controla larguras e evita invadir vizinho (sem a coluna Valor Fixo) */}
          <colgroup>
            <col style={{ width: 28 }} />
            <col style={{ width: 320 }} />
            <col style={{ width: 70 }} />
            <col style={{ width: 70 }} />
            <col style={{ width: 110 }} />
            <col style={{ width: 72 }} />   {/* % Ajuste */}
            <col style={{ width: 210 }} />  {/* Similares */}
            <col style={{ width: 160 }} />  {/* Obs. */}
            <col style={{ width: 110 }} />  {/* Ajustado */}
            <col style={{ width: 70 }} />   {/* Delta */}
          </colgroup>

          <thead className="bg-neutral-50 text-xs">
            <tr>
              <th className="px-3 py-2 text-left">Sel.</th>
              <th className="px-3 py-2 text-left">Item</th>
              <th className="px-3 py-2 text-right">Qtd</th>
              <th className="px-3 py-2 text-right">Unit.</th>
              <th className="px-3 py-2 text-right">Subtotal</th>
              <th className="px-3 py-2 text-right">% Ajuste</th>
              <th className="px-3 py-2 text-left">Similares</th>
              <th className="px-3 py-2 text-left">Obs.</th>
              <th className="px-3 py-2 text-right">Ajustado</th>
              <th className="px-3 py-2 text-right">Δ</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => {
              const pct =
                r.percentual == null || r.percentual === ''
                  ? null
                  : Number(r.percentual);
              const base = toNum(r.subtotal, 0);
              const ajustado = pct == null || !Number.isFinite(pct) ? base : base * (1 + pct / 100);
              const delta = ajustado - base;

              return (
                <tr key={r.id} className="border-t align-top">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={r.checked}
                      onChange={(e) => update(r.id, 'checked', e.currentTarget.checked)}
                      aria-label={`Selecionar item ${r.nome}`}
                    />
                  </td>

                  <td className="px-3 py-2">
                    <div className="font-medium">{r.nome}</div>
                    <div className="text-[11px] text-neutral-500">
                      {r.tipo} {r.unidade ? `• ${r.unidade}` : ''}
                    </div>
                  </td>

                  <td className="px-3 py-2 text-right">{r.quantidade}</td>
                  <td className="px-3 py-2 text-right">{fmtBR(r.precoUnitario)}</td>
                  <td className="px-3 py-2 text-right">{fmtBR(base)}</td>

                  {/* % Ajuste (input estreito de verdade) */}
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end">
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
                        title="Informe porcentagem positiva ou negativa (ex.: 10 ou -5)"
                      />
                    </div>
                  </td>

                  {/* Similares */}
                  <td className="px-3 py-2">
                    <label className="inline-flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={r.aplicarEmSimilares}
                        onChange={(e) =>
                          update(r.id, 'aplicarEmSimilares', e.currentTarget.checked)
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

                  {/* Obs */}
                  <td className="px-3 py-2">
                    <input
                      className="border rounded-md px-2 py-1 text-sm w-full"
                      placeholder="Observação"
                      value={r.observacao ?? ''}
                      onChange={(e) => update(r.id, 'observacao', e.currentTarget.value)}
                    />
                  </td>

                  {/* Ajustado / Δ */}
                  <td className="px-3 py-2 text-right">{fmtBR(ajustado)}</td>
                  <td className="px-3 py-2 text-right">{fmtBR(delta)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* bloco de totais e botão salvar no rodapé */}
      <div className="grid gap-2 text-sm mt-2">
        <div className="text-neutral-700">Fornecedores (base) {fmtBR(totalBase)}</div>
        <div className="text-neutral-700">
          Fornecedores (ajustado) {fmtBR(totalAjustado)} <span className="ml-1">Δ {fmtBR(deltaTotal)}</span>
        </div>
        <div className="text-neutral-700">
          Com honorários (prévia){' '}
          {Number.isFinite(Number(String(honorariosPreview).replace(',', '.')))
            ? fmtBR(totalComHonorarios)
            : fmtBR(totalAjustado)}
        </div>
        <div className="font-semibold">
          Lucro previsto: {fmtBR(lucroPrevisto)}
        </div>

        <div className="mt-2">
          <button
            onClick={salvarTudo}
            className="px-4 py-2 rounded-lg border border-neutral-900 bg-neutral-900 text-white font-semibold"
            title="Salva ajustes selecionados e, se informado, o percentual de honorários"
          >
            Salvar ajustes
          </button>
        </div>
      </div>
    </div>
  );
}
