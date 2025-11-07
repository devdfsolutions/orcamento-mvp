// app/projetos/[id]/itens/page.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

import { prisma } from '@/lib/prisma';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { redirect, notFound } from 'next/navigation';
import {
  ensureEstimativa,
  excluirItem,
  aprovarEstimativa,
  atualizarItem,
} from '@/actions/estimativas';
import AutoCloseForm from '@/components/AutoCloseForm';
import ItemSmartAdd from '@/components/ItemSmartAdd';

/* ===== helpers ===== */
const money = (v: any) =>
  Number(v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

type Props = { params: { id: string }; searchParams?: { e?: string } };

export default async function Page({ params, searchParams }: Props) {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // resolve meu usuario interno
  const me = await prisma.usuario.findUnique({
    where: { supabaseUserId: user.id },
    select: { id: true },
  });
  if (!me) redirect('/login');

  const projetoId = Number(params.id);
  if (!Number.isFinite(projetoId)) notFound();

  // valida que o projeto é MEU
  const projeto = await prisma.projeto.findFirst({
    where: { id: projetoId, usuarioId: me.id },
    include: { cliente: true },
  });
  if (!projeto) notFound();

  // Garante 1 estimativa (SEGURA: só cria se o projeto é meu)
  const estimativaId = await ensureEstimativa(projetoId, me.id);

  // Dados do combo/select APENAS do meu usuário
  const [unidades, fornecedores, produtos, est] = await Promise.all([
    prisma.unidadeMedida.findMany({
      where: { usuarioId: me.id },
      orderBy: { sigla: 'asc' },
    }),
    prisma.fornecedor.findMany({
      where: { usuarioId: me.id },
      orderBy: { nome: 'asc' },
    }),
    prisma.produtoServico.findMany({
      where: { usuarioId: me.id },
      orderBy: { nome: 'asc' },
      include: { unidade: true },
    }),
    prisma.estimativa.findFirst({
      where: { id: estimativaId, usuarioId: me.id, projetoId },
      include: {
        itens: {
          where: { usuarioId: me.id },
          include: { produto: true, unidade: true, fornecedor: true },
          orderBy: { id: 'asc' },
        },
      },
    }),
  ]);

  const itens = est?.itens ?? [];
  const total = itens.reduce((acc, i) => acc + Number(i.totalItem || 0), 0);

  // Mensagem de erro vinda das server actions (via redirect ?e=...)
  const errorMsg =
    searchParams?.e && searchParams.e !== 'NEXT_REDIRECT'
      ? decodeURIComponent(searchParams.e)
      : null;

  return (
    <main style={{ padding: 24, display: 'grid', gap: 16, maxWidth: 1100 }}>
      {errorMsg && (
        <div
          style={{
            padding: '10px 12px',
            border: '1px solid #f1d0d0',
            background: '#ffeaea',
            color: '#7a0000',
            borderRadius: 8,
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* Cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'grid', gap: 4 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
            Projeto #{projeto.id} / Orçamento
          </h1>
          <div style={{ color: '#555' }}>
            {projeto.nome ? <b>{projeto.nome}</b> : <i>Sem nome</i>}
            {projeto.cliente ? (
              <span>
                {' '}
                — Cliente: <b>{projeto.cliente.nome}</b>
              </span>
            ) : (
              <span>
                {' '}
                — Cliente: <i>não vinculado</i>
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href={`/projetos/${projetoId}/orcamento/imprimir`} style={linkBtn}>
            Imprimir / PDF
          </a>
          <a href={`/projetos/${projetoId}/estimativas`} style={linkBtn}>
            Resumo aprovado
          </a>
          <a href={`/projetos/${projetoId}/financeiro`} style={linkBtn}>
            Financeiro
          </a>
        </div>
      </div>

      {/* Barra de status + Aprovar/Desaprovar + Adicionar item (smart) */}
      <section style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <b>Estimativa V1</b>
          <span style={{ color: '#777' }}>
            Criada em {est ? new Date(est.criadaEm).toLocaleDateString('pt-BR') : '—'}
          </span>
          <span
            style={{
              marginLeft: 8,
              padding: '2px 8px',
              borderRadius: 999,
              fontSize: 12,
              background: est?.aprovada ? '#e6ffec' : '#fff7e6',
              border: `1px solid ${est?.aprovada ? '#b7f5c2' : '#ffe2b3'}`,
              color: est?.aprovada ? '#0a7a2f' : '#7a5b0a',
            }}
          >
            {est?.aprovada ? 'APROVADA' : 'EM ESTIMATIVA'}
          </span>

          <form action={aprovarEstimativa} style={{ marginLeft: 'auto' }}>
            <input type="hidden" name="estimativaId" value={estimativaId} />
            <button style={btn}>{est?.aprovada ? 'Desaprovar' : 'Aprovar'}</button>
          </form>
        </div>

        {/* Form inteligente para adicionar item */}
        <ItemSmartAdd
          estimativaId={estimativaId}
          produtos={produtos.map((p) => ({
            id: p.id,
            nome: p.nome,
            unidade: p.unidade ? { id: p.unidade.id, sigla: p.unidade.sigla } : undefined,
          }))}
          unidades={unidades.map((u) => ({ id: u.id, sigla: u.sigla }))}
        />
      </section>

      {/* LISTA */}
      <section>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
          <thead>
            <tr style={{ background: '#f6f6f6' }}>
              <th style={th}>Produto/Serviço</th>
              <th style={th}>Fornecedor</th>
              <th style={th}>Qtd</th>
              <th style={th}>UM</th>
              <th style={{ ...th, textAlign: 'right' }}>Unit. Materiais</th>
              <th style={{ ...th, textAlign: 'right' }}>Unit. Mão de Obra</th>
              <th style={{ ...th, textAlign: 'right' }}>Total do item</th>
              <th style={th}>Editar</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {itens.map((i) => (
              <tr key={i.id}>
                <td style={td}>{i.produto.nome}</td>
                <td style={td}>{i.fornecedor.nome}</td>
                <td style={td}>{Number(i.quantidade).toLocaleString('pt-BR')}</td>
                <td style={td}>{i.unidade.sigla}</td>
                <td style={{ ...td, textAlign: 'right' }}>
                  {i.valorUnitMat == null ? '—' : money(i.valorUnitMat)}
                </td>
                <td style={{ ...td, textAlign: 'right' }}>
                  {i.valorUnitMo == null ? '—' : money(i.valorUnitMo)}
                </td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>{money(i.totalItem)}</td>

                {/* EDITAR inline */}
                <td style={{ ...td, whiteSpace: 'nowrap' }}>
                  <details>
                    <summary style={linkBtn}>Editar</summary>
                    <div style={{ paddingTop: 8 }}>
                      <AutoCloseForm
                        action={atualizarItem}
                        style={{
                          display: 'grid',
                          gap: 8,
                          gridTemplateColumns: '2fr 2fr 100px 120px 1fr 1fr',
                          maxWidth: 950,
                        }}
                      >
                        <input type="hidden" name="id" value={i.id} />
                        <input type="hidden" name="estimativaId" value={estimativaId} />
                        <input type="hidden" name="produtoId" value={i.produtoId} />

                        <select
                          name="fornecedorId"
                          defaultValue={String(i.fornecedorId)}
                          required
                          style={input}
                        >
                          {fornecedores.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.nome}
                            </option>
                          ))}
                        </select>

                        <select
                          name="unidadeId"
                          defaultValue={String(i.unidadeId)}
                          required
                          style={input}
                        >
                          {unidades.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.sigla}
                            </option>
                          ))}
                        </select>

                        <input
                          name="quantidade"
                          defaultValue={String(i.quantidade)}
                          inputMode="decimal"
                          style={input}
                        />

                        <select name="fontePrecoMat" defaultValue={i.fontePrecoMat ?? ''} style={input}>
                          <option value="">Mat: —</option>
                          <option value="P1">P1</option>
                          <option value="P2">P2</option>
                          <option value="P3">P3</option>
                        </select>

                        <select name="fontePrecoMo" defaultValue={i.fontePrecoMo ?? ''} style={input}>
                          <option value="">MO: —</option>
                          <option value="M1">M1</option>
                          <option value="M2">M2</option>
                          <option value="M3">M3</option>
                        </select>

                        <div
                          style={{
                            gridColumn: '1 / span 6',
                            display: 'flex',
                            justifyContent: 'flex-end',
                          }}
                        >
                          <button style={primaryBtn}>Salvar alterações</button>
                        </div>
                      </AutoCloseForm>
                    </div>
                  </details>
                </td>

                {/* EXCLUIR */}
                <td style={{ ...td, textAlign: 'right' }}>
                  <form action={excluirItem} style={{ display: 'inline' }}>
                    <input type="hidden" name="id" value={i.id} />
                    <input type="hidden" name="estimativaId" value={estimativaId} />
                    <button style={dangerBtn}>Excluir</button>
                  </form>
                </td>
              </tr>
            ))}
            {itens.length === 0 && (
              <tr>
                <td style={td} colSpan={9}>
                  Nenhum item adicionado ainda.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '2px solid #ccc' }}>
              <td colSpan={7} style={{ ...td, textAlign: 'right', fontWeight: 700 }}>
                Total
              </td>
              <td colSpan={2} style={{ ...td, textAlign: 'right', fontWeight: 700 }}>
                {money(total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </section>
    </main>
  );
}

/* ===== estilos ===== */
const card: React.CSSProperties = {
  padding: 12,
  border: '1px solid #eee',
  borderRadius: 8,
  background: '#fff',
};
const th: React.CSSProperties = {
  textAlign: 'left',
  padding: 10,
  borderBottom: '1px solid #eee',
  fontWeight: 600,
};
const td: React.CSSProperties = {
  padding: 10,
  borderBottom: '1px solid #f2f2f2',
  verticalAlign: 'top',
};
const input: React.CSSProperties = {
  height: 36,
  padding: '0 10px',
  border: '1px solid '#ddd',
  borderRadius: 8,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};
const btn: React.CSSProperties = {
  height: 30,
  padding: '0 12px',
  borderRadius: 8,
  border: '1px solid #ddd',
  background: '#f8f8f8',
  color: '#111',
  cursor: 'pointer',
};
const primaryBtn: React.CSSProperties = {
  height: 36,
  padding: '0 14px',
  borderRadius: 8,
  border: '1px solid #111',
  background: '#111',
  color: '#fff',
  cursor: 'pointer',
};
const dangerBtn: React.CSSProperties = {
  height: 30,
  padding: '0 10px',
  borderRadius: 8,
  border: '1px solid #f1d0d0',
  background: '#ffeaea',
  color: '#b40000',
  cursor: 'pointer',
};
const linkBtn: React.CSSProperties = {
  display: 'inline-block',
  padding: '8px 12px',
  border: '1px solid #ddd',
  borderRadius: 8,
  background: '#f8f8f8',
  textDecoration: 'none',
  color: '#111',
};
