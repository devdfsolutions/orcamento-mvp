// app/cadastros/vinculos/page.tsx
import React from 'react';
import { prisma } from '@/lib/prisma';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import { upsertVinculo, excluirVinculo } from '@/actions/vinculos';
import InlineVinculoRow from '@/components/InlineVinculoRow';

export const dynamic = 'force-dynamic';

/* ===== helpers visuais (se quiser usar em algum lugar) ===== */
function moneyShort(v: any) {
  if (v == null) return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function dateBR(d: Date | string | null | undefined) {
  if (!d) return '—';
  const x = new Date(d);
  if (isNaN(x.getTime())) return '—';
  const dd = String(x.getDate()).padStart(2, '0');
  const mm = String(x.getMonth() + 1).padStart(2, '0');
  const yyyy = String(x.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
}

export default async function Page() {
  // Auth (Server Component)
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Dados
  const [fornecedores, produtos, vinculos] = await Promise.all([
    prisma.fornecedor.findMany({
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true },
    }),
    prisma.produtoServico.findMany({
      orderBy: { nome: 'asc' },
      select: {
        id: true,
        nome: true,
        unidade: { select: { sigla: true } },
      },
    }),
    prisma.fornecedorProduto.findMany({
      orderBy: [{ produto: { nome: 'asc' } }, { fornecedor: { nome: 'asc' } }],
      include: {
        fornecedor: { select: { id: true, nome: true } },
        produto: { select: { id: true, nome: true, unidade: { select: { sigla: true } } } },
      },
    }),
  ]);

  return (
    <main style={{ padding: 24, display: 'grid', gap: 16, maxWidth: 1400 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>
        Cadastros / Vínculos Fornecedor ↔ Produto
      </h1>

      {/* Novo/Atualizar vínculo (upsert) */}
      <section style={card}>
        <h2 style={h2}>Criar/Atualizar vínculo (upsert)</h2>

        <form
          action={upsertVinculo}
          style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr 1fr 1fr' }}
        >
          <select name="fornecedorId" defaultValue="" required style={{ ...input, height: 36 }}>
            <option value="" disabled>Fornecedor</option>
            {fornecedores.map((f) => (
              <option key={f.id} value={f.id}>{f.nome}</option>
            ))}
          </select>

          <select name="produtoId" defaultValue="" required style={{ ...input, height: 36 }}>
            <option value="" disabled>Produto/Serviço</option>
            {produtos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome} {p.unidade?.sigla ? `(${p.unidade.sigla})` : ''}
              </option>
            ))}
          </select>

          <input name="dataUltAtual" placeholder="Data (DD/MM/AAAA)" style={input} />
          <input name="observacao" placeholder="Observação (opcional)" style={input} />

          {/* Materiais P1/P2/P3 */}
          <input name="precoMatP1" placeholder="Materiais P1 (R$)" inputMode="decimal" style={input} />
          <input name="precoMatP2" placeholder="Materiais P2 (R$)" inputMode="decimal" style={input} />
          <input name="precoMatP3" placeholder="Materiais P3 (R$)" inputMode="decimal" style={input} />

          {/* Mão de obra M1/M2/M3 */}
          <input name="precoMoM1" placeholder="Mão de Obra M1 (R$)" inputMode="decimal" style={input} />
          <input name="precoMoM2" placeholder="Mão de Obra M2 (R$)" inputMode="decimal" style={input} />
          <input name="precoMoM3" placeholder="Mão de Obra M3 (R$)" inputMode="decimal" style={input} />

          <div style={{ gridColumn: '1 / span 4', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" style={btn}>Salvar</button>
          </div>
        </form>

        <p style={{ marginTop: 6, fontSize: 12, color: '#666' }}>
          Dica: selecione o mesmo fornecedor+produto e preencha novos valores para atualizar (upsert).
        </p>
      </section>

      {/* Lista — colunas invertidas: Produto/Serviço → Fornecedor */}
      <section>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            background: '#fff',
            tableLayout: 'fixed',
          }}
        >
          <colgroup>
            <col style={{ width: '25%' }} /> {/* Produto/Serviço */}
            <col style={{ width: '20%' }} /> {/* Fornecedor */}
            <col style={{ width: '10%' }} /> {/* UM */}
            <col style={{ width: 70 }} /> {/* P1 */}
            <col style={{ width: 70 }} /> {/* P2 */}
            <col style={{ width: 70 }} /> {/* P3 */}
            <col style={{ width: 70 }} /> {/* M1 */}
            <col style={{ width: 70 }} /> {/* M2 */}
            <col style={{ width: 70 }} /> {/* M3 */}
            <col style={{ width: '20%' }} /> {/* Atualização */}
            <col style={{ width: '15%' }} /> {/* Obs */}
            <col style={{ width: '12%' }} /> {/* Ações */}
          </colgroup>

          <thead>
            <tr>
              <th style={th}>Produto/Serviço</th>
              <th style={th}>Fornecedor</th>
              <th style={{ ...th, textAlign: 'center' }}>UM</th>
              <th style={{ ...th, textAlign: 'right' }}>P1</th>
              <th style={{ ...th, textAlign: 'right' }}>P2</th>
              <th style={{ ...th, textAlign: 'right' }}>P3</th>
              <th style={{ ...th, textAlign: 'right' }}>M1</th>
              <th style={{ ...th, textAlign: 'right' }}>M2</th>
              <th style={{ ...th, textAlign: 'right' }}>M3</th>
              <th style={th}>Atualização</th>
              <th style={th}>Obs</th>
              <th style={th}></th>
            </tr>
          </thead>

          <tbody>
            {vinculos.map((v) => {
              // garante number para decimais do Prisma (Decimal)
              const safeV = {
                ...v,
                precoMatP1: v.precoMatP1 ? Number(v.precoMatP1) : null,
                precoMatP2: v.precoMatP2 ? Number(v.precoMatP2) : null,
                precoMatP3: v.precoMatP3 ? Number(v.precoMatP3) : null,
                precoMoM1: v.precoMoM1 ? Number(v.precoMoM1) : null,
                precoMoM2: v.precoMoM2 ? Number(v.precoMoM2) : null,
                precoMoM3: v.precoMoM3 ? Number(v.precoMoM3) : null,
              };

              return (
                <InlineVinculoRow
                  key={v.id}
                  v={safeV}
                  onSubmit={upsertVinculo}
                  onDelete={excluirVinculo}
                />
              );
            })}

            {vinculos.length === 0 && (
              <tr>
                <td style={td} colSpan={12}>Nenhum vínculo cadastrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}

/* ===== estilos inline ===== */
const card: React.CSSProperties = {
  padding: 12,
  border: "1px solid #eee",
  borderRadius: 8,
  background: "#fff",
};
const h2: React.CSSProperties = { fontSize: 16, margin: '0 0 10px' };
const th: React.CSSProperties = {
  textAlign: 'left',
  padding: 10,
  borderBottom: '1px solid #eee',
  background: '#fafafa',
  fontWeight: 600,
  whiteSpace: 'normal',
};
const td: React.CSSProperties = {
  padding: 10,
  borderBottom: '1px solid #f2f2f2',
  verticalAlign: 'top',
  wordBreak: 'word-break',
  overflowWrap: 'anywhere',
};
const input: React.CSSProperties = {
  height: 36,
  padding: '0 10px',
  border: '1px solid #ddd',
  borderRadius: 8,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};
const btn: React.CSSProperties = {
  height: 36,
  padding: '0 14px',
  borderRadius: 8,
  border: '1px solid #ddd',
  background: '#111',
  color: '#fff',
  cursor: 'pointer',
};
