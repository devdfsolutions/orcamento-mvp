// app/projetos/[id]/itens/page.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

import { prisma } from '@/lib/prisma';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import {
  ensureEstimativa,
  excluirItem,
  aprovarEstimativa,
  atualizarItem,
} from '@/actions/estimativas';
import { salvarAjusteDoItem } from '@/actions/financeiro';
import AutoCloseForm from '@/components/AutoCloseForm';
import ItemSmartAdd from '@/components/ItemSmartAdd';
import ToggleRowEditing from '@/components/ToggleRowEditing';

/* ===== helpers ===== */
const money = (v: any) =>
  Number(v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

type Props = { params: { id: string }; searchParams?: { e?: string; ok?: string } };

export default async function Page({ params, searchParams }: Props) {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // resolve "me"
  const me = await prisma.usuario.findUnique({
    where: { supabaseUserId: user.id },
    select: { id: true },
  });
  if (!me) redirect('/login');

  const projetoId = Number(params.id);

  // projeto precisa ser meu
  const projeto = await prisma.projeto.findFirst({
    where: { id: projetoId, usuarioId: me.id },
    include: { cliente: true },
  });
  if (!projeto) redirect('/projetos');

  // Garante 1 estimativa
  const estimativaId = await ensureEstimativa(projeto.id);

  // Dados (TODOS filtrados por usuarioId)
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
    prisma.estimativa.findUnique({
      where: { id: estimativaId },
      include: {
        itens: {
          include: {
            produto: true,
            unidade: true,
            fornecedor: true,
            // traz AJUSTE (se houver) para preencher defaults na edição
            financeirosAjustes: {
              where: { projetoId, usuarioId: me.id },
              take: 1,
              orderBy: { id: 'desc' },
            },
          },
          orderBy: { id: 'asc' },
        },
      },
    }),
  ]);

  const itens = est?.itens ?? [];
  const total = itens.reduce((acc, i) => acc + Number(i.totalItem || 0), 0);

  const errorMsg =
    searchParams?.e && searchParams.e !== 'NEXT_REDIRECT'
      ? decodeURIComponent(searchParams.e)
      : null;

  const okMsg = searchParams?.ok === '1';

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
      {okMsg && (
        <div
          style={{
            padding: '8px 10px',
            border: '1px solid #bfe7c6',
            background: '#e6ffec',
            color: '#0a7a2f',
            borderRadius: 8,
          }}
        >
          Salvo com sucesso.
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
              <span> — Cliente: <b>{projeto.cliente.nome}</b></span>
            ) : (
              <span> — Cliente: <i>não vinculado</i></span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href={`/projetos/${projeto.id}/orcamento/imprimir`} style={linkBtn}>
            Imprimir / PDF
          </a>
          <a href={`/projetos/${projeto.id}/estimativas`} style={linkBtn}>
            Resumo aprovado
          </a>
          <a href={`/projetos/${projeto.id}/financeiro`} style={linkBtn}>
            Financeiro
          </a>
        </div>
      </div>

      {/* Barra de status + Aprovar/Desaprovar + Adicionar item (smart) */}
      <section style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <b>Estimativa V1</b>
          <span style={{ color: '#777' }}>
            Criada em {new Date(est!.criadaEm).toLocaleDateString('pt-BR')}
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

      {/* LISTA (inline edit + ajustes) */}
      <section>
        <div className="table-wrap">
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
            <colgroup>
              <col />                                   {/* Produto */}
              <col style={{ width: '18%' }} />          {/* Fornecedor */}
              <col style={{ width: 80 }} />             {/* Qtd */}
              <col style={{ width: 80 }} />             {/* UM */}
              <col style={{ width: 140 }} />            {/* Unit Mat */}
              <col style={{ width: 150 }} />            {/* Unit MO */}
              <col style={{ width: 160 }} />            {/* Total */}
              <col style={{ width: 170 }} />            {/* Ações */}
            </colgroup>

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
              </tr>
            </thead>

            <tbody>
              {itens.map((i) => {
                const rowId = `row-${i.id}`;
                const detailsId = `det-${i.id}`;
                const formItemId = `edit-item-${i.id}`;
                const formAjusteId = `edit-aj-${i.id}`;

                const aj = i.financeirosAjustes?.[0] ?? null;
                const ajPercent = aj?.percentual != null ? Number(aj.percentual) : null;
                const ajFixo    = aj?.valorFixo  != null ? Number(aj.valorFixo)   : null;

                return (
                  <tr key={i.id} id={rowId}>
                    {/* Produto */}
                    <td style={td}>
                      <span className="cell-view">{i.produto.nome}</span>
                      {/* produto não editamos aqui (mantém no item) */}
                    </td>

                    {/* Fornecedor */}
                    <td style={td}>
                      <span className="cell-view">{i.fornecedor.nome}</span>
                      <select
                        form={formItemId}
                        name="fornecedorId"
                        defaultValue={String(i.fornecedorId)}
                        className="cell-edit input input-sm w-full"
                        required
                      >
                        {fornecedores.map((f) => (
                          <option key={f.id} value={f.id}>{f.nome}</option>
                        ))}
                      </select>
                    </td>

                    {/* Quantidade */}
                    <td style={td}>
                      <span className="cell-view">{Number(i.quantidade).toLocaleString('pt-BR')}</span>
                      <input
                        form={formItemId}
                        name="quantidade"
                        defaultValue={String(i.quantidade)}
                        inputMode="decimal"
                        className="cell-edit input input-sm w-full"
                      />
                    </td>

                    {/* UM */}
                    <td style={td}>
                      <span className="cell-view">{i.unidade.sigla}</span>
                      <select
                        form={formItemId}
                        name="unidadeId"
                        defaultValue={String(i.unidadeId)}
                        required
                        className="cell-edit input input-sm w-full"
                      >
                        {unidades.map((u) => (
                          <option key={u.id} value={u.id}>{u.sigla}</option>
                        ))}
                      </select>
                    </td>

                    {/* Unit Mat */}
                    <td style={{ ...td, textAlign: 'right' }}>
                      <span className="cell-view">
                        {i.valorUnitMat == null ? '—' : money(i.valorUnitMat)}
                      </span>
                      <select
                        form={formItemId}
                        name="fontePrecoMat"
                        defaultValue={i.fontePrecoMat ?? ''}
                        className="cell-edit input input-sm w-full"
                      >
                        <option value="">Mat: —</option>
                        <option value="P1">P1</option>
                        <option value="P2">P2</option>
                        <option value="P3">P3</option>
                      </select>
                    </td>

                    {/* Unit MO */}
                    <td style={{ ...td, textAlign: 'right' }}>
                      <span className="cell-view">
                        {i.valorUnitMo == null ? '—' : money(i.valorUnitMo)}
                      </span>
                      <select
                        form={formItemId}
                        name="fontePrecoMo"
                        defaultValue={i.fontePrecoMo ?? ''}
                        className="cell-edit input input-sm w-full"
                      >
                        <option value="">MO: —</option>
                        <option value="M1">M1</option>
                        <option value="M2">M2</option>
                        <option value="M3">M3</option>
                      </select>
                    </td>

                    {/* Total */}
                    <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>
                      {money(i.totalItem)}
                    </td>

                    {/* Ações */}
                    <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {/* Toggle editar */}
                      <details id={detailsId} className="inline-block mr-2 align-middle">
                        <summary className="pill">Editar</summary>
                      </details>

                      {/* Salvar item */}
                      <button type="submit" form={formItemId} className="btn btn-primary btn-sm save-btn align-middle">
                        Salvar item
                      </button>

                      {/* Excluir */}
                      <form action={excluirItem} className="inline ml-2 align-middle">
                        <input type="hidden" name="id" value={i.id} />
                        <input type="hidden" name="estimativaId" value={estimativaId} />
                        <button className="btn btn-danger btn-sm">Excluir</button>
                      </form>

                      {/* ==== FORM oculto (ITEM) ==== */}
                      <AutoCloseForm id={formItemId} action={atualizarItem} className="hidden">
                        <input type="hidden" name="id" value={i.id} />
                        <input type="hidden" name="estimativaId" value={estimativaId} />
                        <input type="hidden" name="produtoId" value={i.produtoId} />
                      </AutoCloseForm>

                      {/* ==== ToggleRowEditing (liga/desliga classe .editing na <tr>) ==== */}
                      <ToggleRowEditing detailsId={detailsId} rowId={rowId} />

                      {/* ====== BLOCO DE AJUSTES (aparece só em modo edição) ====== */}
                      <div className="cell-edit" style={{ marginTop: 8, textAlign: 'left' }}>
                        <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '120px 140px 1fr auto' }}>
                          <input
                            form={formAjusteId}
                            name="percentual"
                            defaultValue={ajPercent != null ? String(ajPercent) : ''}
                            placeholder="% (ex: 10 = +10%)"
                            className="input input-sm"
                            inputMode="decimal"
                          />
                          <input
                            form={formAjusteId}
                            name="valorFixo"
                            defaultValue={ajFixo != null ? String(ajFixo) : ''}
                            placeholder="R$ fixo (opcional)"
                            className="input input-sm"
                            inputMode="decimal"
                          />
                          <input
                            form={formAjusteId}
                            name="observacao"
                            defaultValue={aj?.observacao ?? ''}
                            placeholder="Observação (opcional)"
                            className="input input-sm"
                          />
                          <button type="submit" form={formAjusteId} className="btn btn-sm">
                            Salvar ajustes
                          </button>
                        </div>
                      </div>

                      {/* ==== FORM oculto (AJUSTE) ==== */}
                      <AutoCloseForm id={formAjusteId} action={salvarAjusteDoItem} className="hidden">
                        <input type="hidden" name="projetoId" value={projetoId} />
                        <input type="hidden" name="estimativaItemId" value={i.id} />
                      </AutoCloseForm>
                    </td>
                  </tr>
                );
              })}

              {itens.length === 0 && (
                <tr>
                  <td style={td} colSpan={8}>
                    Nenhum item adicionado ainda.
                  </td>
                </tr>
              )}
            </tbody>

            <tfoot>
              <tr style={{ borderTop: '2px solid #ccc' }}>
                <td colSpan={6} style={{ ...td, textAlign: 'right', fontWeight: 700 }}>
                  Total
                </td>
                <td colSpan={1} style={{ ...td, textAlign: 'right', fontWeight: 700 }}>
                  {money(total)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        {/* estilos locais (iguais ao visual das telas de cadastros) */}
        <style>{`
          .table-wrap{ overflow-x:hidden; }
          .table{ border-collapse:collapse; table-layout:fixed; width:100%; font-size:.95rem; }
          .table thead th{
            background:#f8fafc; color:#6b7280; text-align:left; font-weight:600; font-size:.85rem;
            padding:10px 12px; border-bottom:1px solid #e6e7eb;
          }
          .table tbody td{
            padding:10px 12px; border-bottom:1px solid #e6e7eb; vertical-align:middle; color:#0a0a0a;
            overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
          }
          .table tbody tr:hover td{ background:#fafafa; }
          .input{ height:36px; padding:0 10px; border:1px solid #e6e7eb; border-radius:10px; outline:none; background:#fff; font-size:.95rem; }
          .input-sm{ height:30px; padding:0 8px; font-size:.9rem; }
          .btn{ display:inline-flex; align-items:center; justify-content:center; border:1px solid #e6e7eb; border-radius:9999px; padding:0 12px; height:36px; font-weight:500; background:#f9fafb; color:#0a0a0a; cursor:pointer; transition:.15s; font-size:.95rem; }
          .btn:hover{ background:#f3f4f6; }
          .btn-sm{ height:30px; padding:0 10px; font-size:.85rem; }
          .btn-primary{ background:#111; border-color:#111; color:#fff; }
          .btn-danger{ background:#ffeaea; color:#b40000; border-color:#f1d0d0; }
          .pill{ display:inline-block; padding:5px 10px; border-radius:9999px; border:1px solid #e6e7eb; background:#f7f7fb; color:#0a0a0a; cursor:pointer; font-size:.85rem; }
          details>summary::-webkit-details-marker{ display:none; }
          details>summary{ list-style:none; }

          /* inline edit */
          .cell-edit{ display:none; }
          tr.editing .cell-view{ display:none; }
          tr.editing .cell-edit{ display:block; }
          td .save-btn{ display:none; }
          tr.editing td .save-btn{ display:inline-flex; }
        `}</style>
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
const btn: React.CSSProperties = {
  height: 30,
  padding: '0 12px',
  borderRadius: 8,
  border: '1px solid #ddd',
  background: '#f8f8f8',
  color: '#111',
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
