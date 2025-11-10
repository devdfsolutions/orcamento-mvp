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
import AutoCloseForm from '@/components/AutoCloseForm';
import ToggleRowEditing from '@/components/ToggleRowEditing';

/* ===== helpers ===== */
const money = (v: any) =>
  Number(v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

type Props = { params: { id: string }; searchParams?: { e?: string } };

export default async function Page({ params, searchParams }: Props) {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const projetoId = Number(params.id);

  // resolve projeto (exibe cliente/nome)
  const projeto = await prisma.projeto.findUnique({
    where: { id: projetoId },
    include: { cliente: true },
  });
  if (!projeto) redirect('/projetos');

  // garante 1 estimativa do projeto
  const estimativaId = await ensureEstimativa(projetoId);

  // dados para selects e lista de itens
  const [unidades, fornecedores, est] = await Promise.all([
    prisma.unidadeMedida.findMany({ where: { usuarioId: projeto.usuarioId }, orderBy: { sigla: 'asc' } }),
    prisma.fornecedor.findMany({ where: { usuarioId: projeto.usuarioId }, orderBy: { nome: 'asc' } }),
    prisma.estimativa.findUnique({
      where: { id: estimativaId },
      include: {
        itens: {
          include: { produto: true, unidade: true, fornecedor: true },
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

  return (
    <main className="mx-auto grid gap-4" style={{ padding: 24, maxWidth: 1100 }}>
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
              <span> — Cliente: <b>{projeto.cliente.nome}</b></span>
            ) : (
              <span> — Cliente: <i>não vinculado</i></span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <a href={`/projetos/${projeto.id}/orcamento/imprimir`} className="btn btn-sm">Imprimir / PDF</a>
          <a href={`/projetos/${projeto.id}/estimativas`} className="btn btn-sm">Resumo aprovado</a>
          <a href={`/projetos/${projeto.id}/financeiro`} className="btn btn-sm">Financeiro</a>
        </div>
      </div>

      {/* Barra status + aprovar */}
      <section className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
            <button className="btn">{est?.aprovada ? 'Desaprovar' : 'Aprovar'}</button>
          </form>
        </div>
      </section>

      {/* LISTA (edição inline por linha) */}
      <section className="card p-0 overflow-hidden">
        <div className="table-wrap">
          <table className="table w-full">
            <colgroup>
              <col />                       {/* Produto */}
              <col style={{ width: '22%' }} />  {/* Fornecedor */}
              <col style={{ width: 80 }} />     {/* Qtd */}
              <col style={{ width: 90 }} />     {/* UM */}
              <col style={{ width: 130 }} />    {/* Unit Mat */}
              <col style={{ width: 130 }} />    {/* Unit MO */}
              <col style={{ width: 130 }} />    {/* Total */}
              <col style={{ width: 160 }} />    {/* Editar */}
              <col style={{ width: 110 }} />    {/* Excluir */}
            </colgroup>

            <thead>
              <tr>
                {['Produto/Serviço','Fornecedor','Qtd','UM','Unit. Materiais','Unit. Mão de Obra','Total do item','Editar','']
                  .map((h)=> <th key={h}>{h}</th>)}
              </tr>
            </thead>

            <tbody>
              {itens.map((i) => {
                const rowId = `row-${i.id}`;
                const detailsId = `det-${i.id}`;
                const formId = `edit-${i.id}`;

                return (
                  <tr key={i.id} id={rowId}>
                    {/* Produto (não editamos aqui) */}
                    <td>
                      <span className="cell-view font-medium text-zinc-900">{i.produto.nome}</span>
                    </td>

                    {/* Fornecedor */}
                    <td>
                      <span className="cell-view">{i.fornecedor.nome}</span>
                      <select
                        form={formId}
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
                    <td>
                      <span className="cell-view">{Number(i.quantidade).toLocaleString('pt-BR')}</span>
                      <input
                        form={formId}
                        name="quantidade"
                        defaultValue={String(i.quantidade)}
                        inputMode="decimal"
                        className="cell-edit input input-sm w-full"
                      />
                    </td>

                    {/* UM */}
                    <td>
                      <span className="cell-view">{i.unidade.sigla}</span>
                      <select
                        form={formId}
                        name="unidadeId"
                        defaultValue={String(i.unidadeId)}
                        className="cell-edit input input-sm w-full"
                        required
                      >
                        {unidades.map((u)=>(
                          <option key={u.id} value={u.id}>{u.sigla}</option>
                        ))}
                      </select>
                    </td>

                    {/* Unit Mat */}
                    <td className="text-right">
                      <span className="cell-view">
                        {i.valorUnitMat == null ? '—' : money(i.valorUnitMat)}
                      </span>
                      <select
                        form={formId}
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
                    <td className="text-right">
                      <span className="cell-view">
                        {i.valorUnitMo == null ? '—' : money(i.valorUnitMo)}
                      </span>
                      <select
                        form={formId}
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
                    <td className="text-right">
                      <span className="cell-view" style={{ fontWeight: 600 }}>{money(i.totalItem)}</span>
                    </td>

                    {/* Ações – Editar/Salvar */}
                    <td className="text-right whitespace-nowrap">
                      <details id={detailsId} className="inline-block mr-2 align-middle">
                        <summary className="pill">Editar</summary>
                      </details>

                      <button
                        type="submit"
                        form={formId}
                        className="btn btn-primary btn-sm save-btn align-middle"
                      >
                        Salvar
                      </button>

                      {/* form oculto que recebe inputs via atributo `form` */}
                      <AutoCloseForm id={formId} action={atualizarItem} className="hidden">
                        <input type="hidden" name="id" value={i.id} />
                        <input type="hidden" name="estimativaId" value={estimativaId} />
                        <input type="hidden" name="produtoId" value={i.produtoId} />
                      </AutoCloseForm>

                      <ToggleRowEditing detailsId={detailsId} rowId={rowId} />
                    </td>

                    {/* Excluir */}
                    <td className="text-right whitespace-nowrap">
                      <form action={excluirItem} className="inline">
                        <input type="hidden" name="id" value={i.id} />
                        <input type="hidden" name="estimativaId" value={estimativaId} />
                        <button className="btn btn-danger btn-sm">Excluir</button>
                      </form>
                    </td>
                  </tr>
                );
              })}

              {itens.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center text-zinc-500 py-8">
                    Nenhum item adicionado ainda.
                  </td>
                </tr>
              )}
            </tbody>

            <tfoot>
              <tr style={{ borderTop: '2px solid #ccc' }}>
                <td colSpan={7} className="text-right font-semibold py-3 pr-3">Total</td>
                <td colSpan={2} className="text-right font-semibold py-3 pr-3">{money(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* estilos locais para a tabela/edição inline */}
        <style>{`
          :root{
            --bg:#fff; --border:#e6e7eb; --muted:#f7f7fb;
            --text:#0a0a0a; --subtext:#6b7280;
            --primary:#0f172a; --primary-hover:#0b1222;
            --danger-bg:#fff1f2; --danger-text:#be123c;
          }
          .card{ background:var(--bg); border:1px solid var(--border); border-radius:12px; padding:12px; }
          .btn{ display:inline-flex; align-items:center; justify-content:center; border:1px solid var(--border); border-radius:9999px; padding:0 12px; height:36px; background:#f9fafb; color:var(--text); cursor:pointer; }
          .btn-sm{ height:30px; padding:0 10px; font-size:.85rem; }
          .btn-primary{ background:var(--primary); border-color:var(--primary); color:#fff; }
          .btn-primary:hover{ background:var(--primary-hover); }
          .btn-danger{ background:var(--danger-bg); color:var(--danger-text); border-color:#fecdd3; }
          .pill{ display:inline-block; padding:5px 10px; border-radius:9999px; border:1px solid var(--border); background:var(--muted); cursor:pointer; font-size:.85rem; }
          details>summary::-webkit-details-marker{ display:none; }

          .input{ height:36px; padding:0 10px; border:1px solid var(--border); border-radius:10px; outline:none; background:#fff; }
          .input-sm{ height:30px; padding:0 8px; }

          .table-wrap{ overflow-x:auto; }
          .table{ border-collapse:collapse; table-layout:fixed; width:100%; font-size:.95rem; }
          .table thead th{
            background:#f8fafc; color:var(--subtext); text-align:left; font-weight:600; font-size:.85rem;
            padding:10px 12px; border-bottom:1px solid var(--border); white-space:nowrap;
          }
          .table tbody td{
            padding:10px 12px; border-bottom:1px solid var(--border); vertical-align:middle; color:var(--text);
            overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
          }
          .table tbody tr:hover td{ background:#fafafa; }

          /* inline edit pattern */
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
