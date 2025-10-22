// src/components/FinanceiroTabela.tsx
'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { upsertAjustesFinanceiros, aplicarHonorariosDirect } from '@/actions/financeiro';

type Item = {
  id: number;
  tipo: 'PRODUTO' | 'SERVICO';
  nome: string;
  quantidade: number;
  unidade?: string | null;
  precoUnitario: number;
  subtotal: number;
  ajuste?: { percentual?: number | null; valorFixo?: number | null; observacao?: string | null } | null;
  grupoSimilar?: string | null;
};

function parseDec(v: string | number | null | undefined): number | null {
  if (v == null || v === '') return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export default function FinanceiroTabela(props: {
  projetoId: number;
  usuarioId: number;
  itens: Item[];
  recebemos?: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [rows, setRows] = useState(
    props.itens.map((it) => ({
      ...it,
      checked: false,
      percentual: it.ajuste?.percentual ?? null,
      valorFixo: it.ajuste?.valorFixo ?? null,
      observacao: it.ajuste?.observacao ?? '',
      aplicarEmSimilares: false,
    }))
  );

  const [honorariosPreview, setHonorariosPreview] = useState<number | null>(null);
  const [honorariosToSave, setHonorariosToSave] = useState<string>('');

  function update<K extends keyof (typeof rows)[number]>(id: number, key: K, val: any) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [key]: val } : r)));
  }
  function toggleAll(checked: boolean) {
    setRows((prev) => prev.map((r) => ({ ...r, checked })));
  }

  /* ======== CÁLCULOS AO VIVO ======== */
  const baseTotal = useMemo(
    () => rows.reduce((acc, r) => acc + (r.subtotal || 0), 0),
    [rows]
  );

  const { totalAjustado, deltasPorId, ajustadoPorId } = useMemo(() => {
    const byName = new Map<string, number[]>();
    rows.forEach((r) => {
      if (!r.grupoSimilar) return;
      const arr = byName.get(r.grupoSimilar) || [];
      arr.push(r.id);
      byName.set(r.grupoSimilar, arr);
    });

    const calcItem = (r: (typeof rows)[number]) => {
      const pct = parseDec(r.percentual as any);
      const fix = parseDec(r.valorFixo as any);
      if (fix != null) return Math.max(0, fix);
      if (pct != null) return Math.max(0, r.subtotal * (1 + pct / 100));
      return r.subtotal;
    };

    const adjusted: Record<number, number> = {};
    rows.forEach((r) => (adjusted[r.id] = calcItem(r)));

    // aplicar em similares
    rows.forEach((r) => {
      if (!r.aplicarEmSimilares || !r.grupoSimilar) return;
      const siblings = byName.get(r.grupoSimilar) || [];
      siblings.forEach((sibId) => {
        if (sibId === r.id) return;
        const sib = rows.find((x) => x.id === sibId)!;
        const pct = parseDec(r.percentual as any);
        const fix = parseDec(r.valorFixo as any);
        if (fix != null) adjusted[sibId] = Math.max(0, fix);
        else if (pct != null) adjusted[sibId] = Math.max(0, sib.subtotal * (1 + pct / 100));
      });
    });

    const deltas: Record<number, number> = {};
    rows.forEach((r) => (deltas[r.id] = (adjusted[r.id] ?? r.subtotal) - r.subtotal));

    const sumAdjusted = rows.reduce((acc, r) => acc + (adjusted[r.id] ?? r.subtotal), 0);
    return { totalAjustado: sumAdjusted, deltasPorId: deltas, ajustadoPorId: adjusted };
  }, [rows]);

  const totalComHonorarios = useMemo(() => {
    if (honorariosPreview == null) return totalAjustado;
    return totalAjustado * (1 + honorariosPreview / 100);
  }, [totalAjustado, honorariosPreview]);

  const lucroPrevisto = (props.recebemos ?? 0) - totalComHonorarios;

  /* ======== ACTIONS ======== */
  async function salvarAjustesSelecionados() {
    const payload = rows
      .filter((r) => r.checked)
      .map((r) => ({
        estimativaItemId: r.id,
        percentual: parseDec(r.percentual as any),
        valorFixo: parseDec(r.valorFixo as any),
        observacao: r.observacao?.trim() || null,
        aplicarEmSimilares: !!r.aplicarEmSimilares,
        grupoSimilar: r.grupoSimilar ?? null,
      }));

    if (payload.length === 0) {
      alert('Marque ao menos um item para salvar.');
      return;
    }

    startTransition(async () => {
      const res = await upsertAjustesFinanceiros({
        projetoId: props.projetoId,
        usuarioId: props.usuarioId,
        itens: payload,
      });
      if ((res as any)?.ok) {
        router.refresh();
        alert('Ajustes salvos!');
      } else {
        alert('Falha ao salvar.');
      }
    });
  }

  async function aplicarHonorarios() {
    const pct = parseDec(honorariosToSave);
    if (pct == null) {
      alert('Informe um percentual válido.');
      return;
    }
    startTransition(async () => {
      const res = await aplicarHonorariosDirect({
        projetoId: props.projetoId,
        usuarioId: props.usuarioId,
        percentual: pct,
      });
      if ((res as any)?.ok) {
        router.refresh();
        alert('Honorários aplicados!');
      } else {
        alert((res as any)?.message || 'Falha ao aplicar honorários.');
      }
    });
  }

  /* ======== UI ======== */
  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="rounded-lg border p-3">
        <div className="flex flex-wrap items-center gap-3 md:gap-4">
          {/* Ações em lote */}
          <div className="flex items-center gap-2">
            <button
              className="h-8 px-3 rounded-md border text-sm"
              onClick={() => toggleAll(true)}
              type="button"
            >
              Selecionar todos
            </button>
            <button
              className="h-8 px-3 rounded-md border text-sm"
              onClick={() => toggleAll(false)}
              type="button"
            >
              Limpar seleção
            </button>
          </div>

          <div className="hidden md:block w-px h-6 bg-neutral-200" />

          {/* Prévia + aplicar honorários */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-neutral-700">
              Prévia honorários (%)
            </label>
            <input
              className="h-8 w-20 border rounded-md px-2 text-right text-sm"
              inputMode="decimal"
              placeholder="ex.: 10"
              value={honorariosPreview ?? ''}
              onChange={(e) => {
                const v = parseDec(e.currentTarget.value);
                setHonorariosPreview(v);
              }}
              title="Só pré-visualização (não grava)."
            />
            <span className="text-neutral-300">|</span>
            <input
              className="h-8 w-20 border rounded-md px-2 text-right text-sm"
              inputMode="decimal"
              placeholder="ex.: 10"
              value={honorariosToSave}
              onChange={(e) => setHonorariosToSave(e.currentTarget.value)}
              title="Percentual a gravar como honorários."
            />
            <button
              onClick={aplicarHonorarios}
              disabled={isPending}
              className="h-8 px-3 rounded-md border border-neutral-900 bg-white text-neutral-900 text-sm font-semibold disabled:opacity-60"
              title="Grava um ajuste de honorários para o projeto"
              type="button"
            >
              {isPending ? 'Gravando…' : 'Aplicar honorários'}
            </button>
          </div>

          <div className="hidden md:block w-px h-6 bg-neutral-200" />

          {/* Salvar ajustes */}
          <div className="ml-auto">
            <button
              onClick={salvarAjustesSelecionados}
              disabled={isPending}
              className="h-8 px-4 rounded-md border border-neutral-900 bg-neutral-900 text-white text-sm font-semibold disabled:opacity-60"
              title="Cria registros em FinanceiroAjuste sem alterar a estimativa original"
              type="button"
            >
              {isPending ? 'Salvando…' : 'Salvar ajustes'}
            </button>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full table-auto text-sm">
          <thead className="bg-neutral-50 text-xs">
            <tr className="text-neutral-700">
              <th className="px-3 py-2 text-left w-10">Sel.</th>
              <th className="px-3 py-2 text-left">Item</th>
              <th className="px-3 py-2 text-right w-16">Qtd</th>
              <th className="px-3 py-2 text-right w-24">Unit.</th>
              <th className="px-3 py-2 text-right w-28">Subtotal</th>
              <th className="px-3 py-2 text-right w-20">% Ajuste</th>
              <th className="px-3 py-2 text-right w-28">Valor Fixo</th>
              <th className="px-3 py-2 w-40">Similares</th>
              <th className="px-3 py-2 w-56">Obs.</th>
              <th className="px-3 py-2 text-right w-28">Ajustado</th>
              <th className="px-3 py-2 text-right w-24">Δ</th>
            </tr>
          </thead>
          <tbody className="[&>tr]:align-middle">
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
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

                <td className="px-3 py-2 text-right whitespace-nowrap">{r.quantidade}</td>

                <td className="px-3 py-2 text-right whitespace-nowrap">
                  {r.precoUnitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </td>

                <td className="px-3 py-2 text-right whitespace-nowrap">
                  {r.subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </td>

                <td className="px-3 py-2 text-right">
                  <input
                    className="h-8 w-16 border rounded-md px-2 text-right text-sm"
                    inputMode="decimal"
                    placeholder="%"
                    value={r.percentual ?? ''}
                    onChange={(e) => update(r.id, 'percentual', e.currentTarget.value)}
                    title="Use valores positivos/negativos (ex.: 10 ou -5)"
                  />
                </td>

                <td className="px-3 py-2 text-right">
                  <input
                    className="h-8 w-28 border rounded-md px-2 text-right text-sm"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={r.valorFixo ?? ''}
                    onChange={(e) => update(r.id, 'valorFixo', e.currentTarget.value)}
                    title="Valor final para o item; ignora a % se preenchido"
                  />
                </td>

                <td className="px-3 py-2">
                  <label className="inline-flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={r.aplicarEmSimilares}
                      onChange={(e) => update(r.id, 'aplicarEmSimilares', e.currentTarget.checked)}
                    />
                    similares
                  </label>
                  {r.grupoSimilar ? (
                    <div className="inline-block ml-2 align-middle">
                      <span className="text-[11px] rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-600">
                        grupo: {r.grupoSimilar}
                      </span>
                    </div>
                  ) : null}
                </td>

                <td className="px-3 py-2">
                  <input
                    className="h-8 w-56 border rounded-md px-2 text-sm"
                    placeholder="Observação"
                    value={r.observacao ?? ''}
                    onChange={(e) => update(r.id, 'observacao', e.currentTarget.value)}
                  />
                </td>

                <td className="px-3 py-2 text-right whitespace-nowrap">
                  {(ajustadoPorId[r.id] ?? r.subtotal).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </td>

                <td
                  className={`px-3 py-2 text-right whitespace-nowrap ${
                    (deltasPorId[r.id] ?? 0) >= 0 ? 'text-emerald-700' : 'text-red-700'
                  }`}
                >
                  {(deltasPorId[r.id] ?? 0).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Resumo ao vivo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-lg border p-3">
          <div className="text-xs text-neutral-600">Fornecedores (base)</div>
          <div className="mt-1 font-semibold">
            {baseTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </div>
        </div>
        <div className="rounded-lg border p-3">
          <div className="text-xs text-neutral-600">Fornecedores (ajustado)</div>
          <div className="mt-1 font-semibold">
            {totalAjustado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </div>
          <div className="mt-1 text-xs text-neutral-500">
            Δ{' '}
            {(totalAjustado - baseTotal).toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            })}
          </div>
        </div>
        <div className="rounded-lg border p-3">
          <div className="text-xs text-neutral-600">Com honorários (prévia)</div>
          <div className="mt-1 font-semibold">
            {totalComHonorarios.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </div>
          <div className="mt-1 text-xs text-neutral-500">
            {props.recebemos != null ? (
              <>
                Lucro previsto:{' '}
                <b className={lucroPrevisto >= 0 ? 'text-emerald-700' : 'text-red-700'}>
                  {lucroPrevisto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </b>
              </>
            ) : (
              ' '
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
