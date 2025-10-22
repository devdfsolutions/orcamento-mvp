// src/components/FinanceiroTabela.tsx
'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { upsertAjustesFinanceiros } from '@/actions/financeiro';

type Item = {
  id: number;
  tipo: 'PRODUTO' | 'SERVICO';
  nome: string;
  quantidade: number;
  unidade?: string | null;
  precoUnitario: number; // base unit
  subtotal: number;      // base subtotal
  ajuste?: {
    percentual?: number | null;
    valorFixo?: number | null;
    observacao?: string | null;
  } | null;
  grupoSimilar?: string | null; // para marcar "aplicar em similares"
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
  recebemos?: number; // usado na prévia de lucro
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

  // prévia de honorários só para cálculo (não persiste)
  const [honorariosPreview, setHonorariosPreview] = useState<number | null>(null);

  function update<K extends keyof (typeof rows)[number]>(id: number, key: K, val: any) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [key]: val } : r)));
  }

  function toggleAll(checked: boolean) {
    setRows((prev) => prev.map((r) => ({ ...r, checked })));
  }

  // ===== CÁLCULOS EM TEMPO REAL =====
  // regra: se Valor Fixo for informado => final = valorFixo
  //        senão se % informado => final = subtotal * (1 + %/100)
  //        senão final = subtotal
  const baseTotal = useMemo(
    () => rows.reduce((acc, r) => acc + (r.subtotal || 0), 0),
    [rows]
  );

  // aplica pré-visualização dos "similares" *apenas para efeito visual*:
  const { totalAjustado, deltasPorId, ajustadoPorId } = useMemo(() => {
    const byName = new Map<string, number[]>(); // nome -> ids
    rows.forEach((r) => {
      if (!r.grupoSimilar) return;
      const arr = byName.get(r.grupoSimilar) || [];
      arr.push(r.id);
      byName.set(r.grupoSimilar, arr);
    });

    // calcula subtotais ajustados por item
    const calcItem = (r: (typeof rows)[number]) => {
      const pct = parseDec(r.percentual as any);
      const fix = parseDec(r.valorFixo as any);
      if (fix != null) return Math.max(0, fix);
      if (pct != null) return Math.max(0, r.subtotal * (1 + pct / 100));
      return r.subtotal;
    };

    // comece com cada item ajustado isoladamente
    const adjusted: Record<number, number> = {};
    rows.forEach((r) => (adjusted[r.id] = calcItem(r)));

    // se marcar "aplicarEmSimilares", propaga os campos de quem marcou
    rows.forEach((r) => {
      if (!r.aplicarEmSimilares || !r.grupoSimilar) return;
      const siblings = byName.get(r.grupoSimilar) || [];
      siblings.forEach((sibId) => {
        if (sibId === r.id) return;
        const sib = rows.find((x) => x.id === sibId)!;
        const pct = parseDec(r.percentual as any);
        const fix = parseDec(r.valorFixo as any);
        // aplica a regra do "r" ao irmão
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

  const lucroPrevisto =
    (props.recebemos ?? 0) - totalComHonorarios; // usando "recebemos" vindo da page

  // ===== SALVAR =====
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
      try {
        await upsertAjustesFinanceiros({
          projetoId: props.projetoId,
          usuarioId: props.usuarioId,
          itens: payload,
        });
        router.refresh();
        alert('Ajustes salvos!');
      } catch (e) {
        console.error(e);
        alert('Falha ao salvar ajustes.');
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleAll(true)}
            className="px-3 py-1.5 rounded-md border text-sm"
            title="Selecionar todos"
          >
            Selecionar todos
          </button>
          <button
            onClick={() => toggleAll(false)}
            className="px-3 py-1.5 rounded-md border text-sm"
            title="Limpar seleção"
          >
            Limpar seleção
          </button>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm text-neutral-600">
            Prévia de honorários (%){' '}
            <input
              className="ml-2 w-20 border rounded-md px-2 py-1 text-right"
              inputMode="decimal"
              value={honorariosPreview ?? ''}
              placeholder="ex.: 10"
              onChange={(e) => {
                const v = parseDec(e.currentTarget.value);
                setHonorariosPreview(v);
              }}
              title="Só afeta o cálculo de prévia (o ajuste final é aplicado no botão 'Aplicar honorários' mais abaixo)"
            />
          </label>

          <button
            onClick={salvarAjustesSelecionados}
            disabled={isPending}
            className="px-4 py-2 rounded-lg border border-neutral-900 bg-neutral-900 text-white font-semibold disabled:opacity-60"
            title="Cria registros em FinanceiroAjuste sem alterar a estimativa original"
          >
            {isPending ? 'Salvando…' : 'Salvar ajustes'}
          </button>
        </div>
      </div>

      {/* Tabela */}
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
              <th className="px-3 py-2 text-right">Ajustado</th>
              <th className="px-3 py-2 text-right">Δ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t align-middle">
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
                <td className="px-3 py-2 text-right">
                  {r.precoUnitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </td>
                <td className="px-3 py-2 text-right">
                  {r.subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </td>

                <td className="px-3 py-2 text-right">
                  <input
                    className="w-24 border rounded-md px-2 py-1 text-right"
                    inputMode="decimal"
                    placeholder="%"
                    value={r.percentual ?? ''}
                    onChange={(e) => update(r.id, 'percentual', e.currentTarget.value)}
                    title="Informe porcentagem positiva ou negativa (ex.: 10 ou -5)"
                  />
                </td>

                <td className="px-3 py-2 text-right">
                  <input
                    className="w-28 border rounded-md px-2 py-1 text-right"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={r.valorFixo ?? ''}
                    onChange={(e) => update(r.id, 'valorFixo', e.currentTarget.value)}
                    title="Valor final (R$) a aplicar sobre este item; ignora a % se preenchido"
                  />
                </td>

                <td className="px-3 py-2">
                  <label className="inline-flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={r.aplicarEmSimilares}
                      onChange={(e) => update(r.id, 'aplicarEmSimilares', e.currentTarget.checked)}
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
                    value={r.observacao ?? ''}
                    onChange={(e) => update(r.id, 'observacao', e.currentTarget.value)}
                  />
                </td>

                <td className="px-3 py-2 text-right">
                  {(ajustadoPorId[r.id] ?? r.subtotal).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </td>
                <td
                  className={`px-3 py-2 text-right ${
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
                <b
                  className={lucroPrevisto >= 0 ? 'text-emerald-700' : 'text-red-700'}
                >
                  {lucroPrevisto.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </b>
              </>
            ) : (
              ' '
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-neutral-500">
        Dica: marque os itens, preencha % ou R$, e clique em <b>Salvar ajustes</b>. Se marcar
        “aplicar em similares”, os itens com o mesmo nome serão ajustados juntos. A seção de
        “Honorários/Consultoria” abaixo grava o honorário definitivo; aqui é só prévia.
      </p>
    </div>
  );
}
