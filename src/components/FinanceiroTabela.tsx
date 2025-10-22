// src/components/FinanceiroTabela.tsx
'use client';

import { useMemo, useState } from 'react';
import { upsertAjustesFinanceiros } from '@/actions/financeiro';

type Item = {
  id: number;
  tipo: 'PRODUTO' | 'SERVICO';
  nome: string;
  quantidade: number;
  unidade?: string | null;
  precoUnitario: number;
  subtotal: number;
  ajuste?: { percentual?: number | null; observacao?: string | null } | null;
  grupoSimilar?: string | null;
};

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
      aplicarEmSimilares: false,
    }))
  );

  // Honorários único (na toolbar). Deixe vazio para não aplicar.
  const [honorariosPercentual, setHonorariosPercentual] = useState<number | ''>('');

  function update<K extends keyof (typeof rows)[number]>(id: number, key: K, val: any) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [key]: val } : r)));
  }
  function toggleAll(checked: boolean) {
    setRows((prev) => prev.map((r) => ({ ...r, checked })));
  }
  function clearSelection() {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        checked: false,
      }))
    );
  }

  // ---- PREVIEWS -------------------------------------------------------------
  const baseTotal = useMemo(
    () => rows.reduce((acc, r) => acc + (Number.isFinite(r.subtotal) ? r.subtotal : 0), 0),
    [rows]
  );

  const ajustadoPorItem = useMemo(() => {
    return rows.map((r) => {
      const p = r.percentual == null || r.percentual === '' ? 0 : Number(r.percentual) || 0;
      const valor = r.subtotal * (1 + p / 100);
      const delta = valor - r.subtotal;
      return { id: r.id, valor, delta };
    });
  }, [rows]);

  const totalAjustado = useMemo(
    () => ajustadoPorItem.reduce((acc, a) => acc + a.valor, 0),
    [ajustadoPorItem]
  );

  const deltaTotal = useMemo(() => totalAjustado - baseTotal, [baseTotal, totalAjustado]);

  const comHonorarios = useMemo(() => {
    const h = honorariosPercentual === '' ? 0 : Number(honorariosPercentual) || 0;
    return totalAjustado * (1 + h / 100);
  }, [totalAjustado, honorariosPercentual]);

  const lucroPrev = useMemo(() => props.recebemos - comHonorarios, [props.recebemos, comHonorarios]);

  // ---- SUBMIT ---------------------------------------------------------------
  async function salvar() {
    const payload = rows
      .filter((r) => r.checked)
      .map((r) => ({
        estimativaItemId: r.id,
        // % é o único campo de ajuste (valor fixo foi removido)
        percentual:
          r.percentual == null || r.percentual === '' ? null : Number(r.percentual) || 0,
        observacao: r.observacao?.trim() || null,
        aplicarEmSimilares: !!r.aplicarEmSimilares,
        grupoSimilar: r.grupoSimilar ?? null,
      }));

    await upsertAjustesFinanceiros({
      projetoId: props.projetoId,
      usuarioId: props.usuarioId,
      itens: payload,
      honorariosPercentual:
        honorariosPercentual === '' ? null : Number(honorariosPercentual) || 0,
    });
  }

  // ---- UI -------------------------------------------------------------------
  return (
    <div className="mt-2">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => toggleAll(true)}
            className="px-3 py-1 rounded-md border text-sm"
          >
            Selecionar todos
          </button>
          <button
            type="button"
            onClick={clearSelection}
            className="px-3 py-1 rounded-md border text-sm"
          >
            Limpar seleção
          </button>
        </div>

        {/* Espaço visual entre botões e honorários */}
        <div className="w-px h-6 bg-neutral-200 mx-1" />

        <label className="text-sm text-neutral-600">
          Honorários (%)
          <input
            className="ml-2 w-20 border rounded-md px-2 py-1 text-right"
            inputMode="decimal"
            placeholder="ex.: 10"
            value={honorariosPercentual}
            onChange={(e) => {
              const v = e.currentTarget.value;
              if (v === '') return setHonorariosPercentual('');
              setHonorariosPercentual(Number(v));
            }}
            title="Percentual de honorários sobre o total ajustado (prévia)"
          />
        </label>
      </div>

      {/* Respiro entre toolbar e a tabela */}
      <div className="h-2" />

      {/* Tabela */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50 text-xs">
            <tr>
              <th className="px-3 py-2 w-10 text-left">Sel.</th>
              <th className="px-3 py-2 text-left">Item</th>
              <th className="px-3 py-2 w-16 text-right">Qtd</th>
              <th className="px-3 py-2 w-16 text-right">Unit.</th>
              <th className="px-3 py-2 w-24 text-right">Subtotal</th>
              <th className="px-3 py-2 w-16 text-right">% Ajuste</th>
              <th className="px-3 py-2 w-[11rem]">Similares</th>
              <th className="px-3 py-2 w-48">Obs.</th>
              <th className="px-3 py-2 w-28 text-right">Ajustado</th>
              <th className="px-3 py-2 w-20 text-right">Δ</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => {
              const aj = ajustadoPorItem.find((a) => a.id === r.id)!;
              return (
                <tr key={r.id} className="border-t align-middle">
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={r.checked}
                      onChange={(e) => update(r.id, 'checked', e.currentTarget.checked)}
                      aria-label={`Selecionar ${r.nome}`}
                    />
                  </td>

                  <td className="px-3 py-3">
                    <div className="font-medium">{r.nome}</div>
                    <div className="text-[11px] text-neutral-500">
                      {r.tipo} {r.unidade ? `• ${r.unidade}` : ''}
                    </div>
                  </td>

                  <td className="px-3 py-3 text-right whitespace-nowrap">{r.quantidade}</td>
                  <td className="px-3 py-3 text-right whitespace-nowrap">
                    {r.precoUnitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td className="px-3 py-3 text-right whitespace-nowrap">
                    {r.subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>

                  <td className="px-3 py-3 text-right">
                    <input
                      className="w-16 border rounded-md px-2 py-1 text-right"
                      inputMode="decimal"
                      placeholder="%"
                      value={r.percentual ?? ''}
                      onChange={(e) => update(r.id, 'percentual', e.currentTarget.value)}
                      title="Informe porcentagem positiva ou negativa (ex.: 10 ou -5)"
                    />
                  </td>

                  <td className="px-3 py-3">
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

                  <td className="px-3 py-3">
                    <input
                      className="w-48 border rounded-md px-2 py-1"
                      placeholder="Observação"
                      value={r.observacao ?? ''}
                      onChange={(e) => update(r.id, 'observacao', e.currentTarget.value)}
                    />
                  </td>

                  <td className="px-3 py-3 text-right whitespace-nowrap">
                    {aj.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td className="px-3 py-3 text-right whitespace-nowrap">
                    {aj.delta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Respiro entre tabela e totais */}
      <div className="h-4" />

      {/* Totais / Prévia */}
      <div className="grid gap-2 text-sm">
        <div>Fornecedores (base)</div>
        <div className="text-neutral-800">
          {baseTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </div>

        <div className="mt-1">Fornecedores (ajustado)</div>
        <div>
          {totalAjustado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}{' '}
          <span className="text-neutral-500 ml-1">
            Δ {deltaTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        </div>

        <div className="mt-1">Com honorários (prévia)</div>
        <div className="font-medium">
          {comHonorarios.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </div>

        <div className="mt-1">
          Lucro previsto:{' '}
          <span className={lucroPrev >= 0 ? 'text-green-700' : 'text-red-700'}>
            {lucroPrev.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        </div>
      </div>

      {/* Rodapé: ação primária com bom respiro */}
      <div className="mt-4 flex justify-start">
        <button
          onClick={salvar}
          className="px-4 py-2 rounded-lg border border-neutral-900 bg-neutral-900 text-white font-semibold"
          title="Cria registros em FinanceiroAjuste sem alterar a estimativa original"
        >
          Salvar ajustes
        </button>
      </div>
    </div>
  );
}
