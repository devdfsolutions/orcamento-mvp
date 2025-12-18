export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSupabaseServer } from "@/lib/supabaseServer";

import ConfirmSubmit from "@/components/ConfirmSubmit";
import AutoCloseForm from "@/components/AutoCloseForm";
import ToggleRowEditing from "@/components/ToggleRowEditing";
import NovoItemVinculado from "@/components/NovoItemVinculado";

import { ensureEstimativa, atualizarItem, excluirItem } from "@/actions/estimativas";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ e?: string; ok?: string }>;
};

type ProdutoRow = {
  id: number;
  nome: string | null;
  unidadeMedidaId: number;
};
type FornecedorRow = { id: number; nome: string | null };
type UnidadeRow = { id: number; sigla: string | null };

type ItemRow = {
  id: number;
  estimativaId: number;
  usuarioId: number;
  produtoId: number;
  fornecedorId: number | null;
  unidadeId: number | null;
  ajusteTipo: string | null;
  ajusteValor: unknown;
  quantidade: unknown;
  fontePrecoMat: unknown;
  fontePrecoMo: unknown;
  valorUnitMat: unknown;
  valorUnitMo: unknown;
  totalItem: unknown;
  createdAt: Date;
  updatedAt: Date;
};

type VinculoRow = { produtoId: number; fornecedorId: number };

const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function fmtAjuste(tipo: string | null, valor: unknown) {
  const n = Number(valor ?? 0);
  if (!tipo || !Number.isFinite(n) || n === 0) return "—";
  if (tipo === "percent") return `${n}%`;
  return money(n); // fixo
}

const fontesMat = [
  { v: "", l: "—" },
  { v: "P1", l: "P1" },
  { v: "P2", l: "P2" },
  { v: "P3", l: "P3" },
  { v: "MANUAL", l: "MANUAL" },
] as const;

const fontesMo = [
  { v: "", l: "—" },
  { v: "M1", l: "M1" },
  { v: "M2", l: "M2" },
  { v: "M3", l: "M3" },
  { v: "MANUAL", l: "MANUAL" },
] as const;

export default async function Page({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = (await searchParams) ?? undefined;

  const projetoId = Number(id);
  if (!projetoId) redirect("/projetos?e=Projeto inválido");

  // auth
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const me = await prisma.usuario.findUnique({
    where: { supabaseUserId: user.id },
    select: { id: true, role: true },
  });
  if (!me) redirect("/login");
  if (me.role === "ADM") redirect("/admin");

  const projeto = await prisma.projeto.findFirst({
    where: { id: projetoId, usuarioId: me.id },
    include: { cliente: { select: { id: true, nome: true } } },
  });
  if (!projeto) redirect("/projetos?e=Projeto não encontrado");

  const estimativaId = await ensureEstimativa(projetoId);

  const [produtos, fornecedores, unidades, vinculos] = (await Promise.all([
    prisma.produtoServico.findMany({
      where: { usuarioId: me.id },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, unidadeMedidaId: true },
    }),
    prisma.fornecedor.findMany({
      where: { usuarioId: me.id },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
    prisma.unidadeMedida.findMany({
      where: { usuarioId: me.id },
      orderBy: { sigla: "asc" },
      select: { id: true, sigla: true },
    }),
    prisma.fornecedorProduto.findMany({
      where: { usuarioId: me.id },
      select: { produtoId: true, fornecedorId: true },
    }),
  ])) as [ProdutoRow[], FornecedorRow[], UnidadeRow[], VinculoRow[]];

  const produtoMap = new Map<number, string>(produtos.map((p) => [p.id, p.nome ?? "—"]));
  const fornecedorMap = new Map<number, string>(fornecedores.map((f) => [f.id, f.nome ?? "—"]));
  const unidadeMap = new Map<number, string>(unidades.map((u) => [u.id, u.sigla ?? "—"]));

  const itens = (await prisma.estimativaItem.findMany({
    where: { usuarioId: me.id, estimativaId },
    orderBy: { id: "asc" },
    select: {
      id: true,
      estimativaId: true,
      usuarioId: true,
      produtoId: true,
      fornecedorId: true,
      unidadeId: true,
      ajusteTipo: true,
      ajusteValor: true,
      quantidade: true,
      fontePrecoMat: true,
      fontePrecoMo: true,
      valorUnitMat: true,
      valorUnitMo: true,
      totalItem: true,
      createdAt: true,
      updatedAt: true,
    },
  })) as ItemRow[];

  // ✅ Total REAL (sem ajuste): quantidade * (mat + mo)
  const totalSemAjuste = itens.reduce((acc, it) => {
    const qtd = Number(it.quantidade ?? 0);
    const mat = Number(it.valorUnitMat ?? 0);
    const mo = Number(it.valorUnitMo ?? 0);
    return acc + qtd * (mat + mo);
  }, 0);

  // ✅ Total COM ajuste: usa totalItem (já calculado pela action)
  const totalComAjuste = itens.reduce((acc, it) => acc + Number(it.totalItem ?? 0), 0);

  return (
    <main className="max-w-[1180px] mr-auto ml-6 p-6 grid gap-5">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Projeto #{projeto.id} — {projeto.nome}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Cliente: <span className="text-zinc-800">{projeto.cliente?.nome ?? "—"}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link className="btn btn-sm" href="/projetos">
            Projetos
          </Link>
          <Link className="btn btn-sm" href={`/projetos/${projeto.id}/estimativas`}>
            Estimativas
          </Link>
        </div>
      </header>

      {!!sp?.e && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-800">❌ {sp.e}</div>
      )}
      {!!sp?.ok && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">✅ OK</div>
      )}

      <section className="card">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-sm text-zinc-500">Total (Valor de Venda)</div>
            <div className="text-2xl font-semibold">{money(totalComAjuste)}</div>

            <div className="mt-2 text-sm text-zinc-500">Total real (Valor de Custo)</div>
            <div className="text-lg font-semibold text-zinc-900">{money(totalSemAjuste)}</div>
          </div>

          <div className="text-sm text-zinc-500">
            Estimativa ID: <span className="text-zinc-800 font-medium">{estimativaId}</span>
          </div>
        </div>
      </section>

      {/* novo item */}
      <section className="card">
        <div className="card-head mb-2">
          <h2>Novo item</h2>
        </div>

        <NovoItemVinculado
          estimativaId={estimativaId}
          produtos={produtos}
          fornecedores={fornecedores}
          unidades={unidades}
          vinculos={vinculos}
          fontesMat={fontesMat}
          fontesMo={fontesMo}
        />
      </section>

      {/* tabela itens */}
      <section className="card p-0 overflow-hidden">
        <div className="table-wrap">
          <table className="table w-full">
            <colgroup>
              {[
                { w: "64px" },
                { w: "28%" },
                { w: "20%" },
                { w: "70px" },
                { w: "70px" },
                { w: "110px" },
                { w: "110px" },
                { w: "140px" },
                { w: "120px" },
                { w: "190px" },
              ].map((c, i) => (
                <col key={i} style={c.w ? { width: c.w } : undefined} />
              ))}
            </colgroup>

            <thead>
              <tr>
                {["ID", "Produto", "Fornecedor", "Un", "Qtd", "Mat", "MO", "Ajuste", "Total", "Ações"].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {itens.map((it) => {
                const detailsId = `det-${it.id}`;
                const rowId = `row-${it.id}`;
                const formId = `edit-${it.id}`;

                const produtoNome = produtoMap.get(it.produtoId) ?? "—";
                const fornecedorNome =
                  it.fornecedorId != null ? fornecedorMap.get(it.fornecedorId) ?? "—" : "—";
                const unidadeSigla = it.unidadeId != null ? unidadeMap.get(it.unidadeId) ?? "—" : "—";

                const ajusteView = fmtAjuste(it.ajusteTipo, it.ajusteValor);

                const ajusteDefault =
                  it.ajusteTipo === "percent"
                    ? `${Number(it.ajusteValor ?? 0)}%`
                    : it.ajusteTipo === "fixo"
                    ? String(Number(it.ajusteValor ?? 0))
                    : "";

                return (
                  <tr key={it.id} id={rowId}>
                    <td>
                      <span className="cell-view">{it.id}</span>
                    </td>

                    <td>
                      <span className="cell-view font-medium text-zinc-900">{produtoNome}</span>
                      <select
                        form={formId}
                        name="produtoId"
                        defaultValue={it.produtoId}
                        className="cell-edit input input-sm w-full"
                        required
                      >
                        {produtos.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nome ?? "—"}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td>
                      <span className="cell-view">{fornecedorNome}</span>
                      <select
                        form={formId}
                        name="fornecedorId"
                        defaultValue={it.fornecedorId ?? ""}
                        className="cell-edit input input-sm w-full"
                        required
                      >
                        <option value="" disabled>
                          —
                        </option>
                        {fornecedores.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.nome ?? "—"}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td>
                      <span className="cell-view">{unidadeSigla}</span>
                      <span className="cell-edit text-sm text-zinc-500">Auto</span>
                    </td>

                    <td>
                      <span className="cell-view">{Number(it.quantidade ?? 0)}</span>
                      <input
                        form={formId}
                        name="quantidade"
                        defaultValue={String(it.quantidade ?? "")}
                        className="cell-edit input input-sm w-full"
                        inputMode="decimal"
                        required
                      />
                    </td>

                    <td className="whitespace-nowrap">
                      <span className="cell-view">{money(Number(it.valorUnitMat ?? 0))}</span>
                      <select
                        form={formId}
                        name="fontePrecoMat"
                        defaultValue={String(it.fontePrecoMat ?? "")}
                        className="cell-edit input input-sm w-full"
                      >
                        {fontesMat.map((x) => (
                          <option key={x.v} value={x.v}>
                            {x.l}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="whitespace-nowrap">
                      <span className="cell-view">{money(Number(it.valorUnitMo ?? 0))}</span>
                      <select
                        form={formId}
                        name="fontePrecoMo"
                        defaultValue={String(it.fontePrecoMo ?? "")}
                        className="cell-edit input input-sm w-full"
                      >
                        {fontesMo.map((x) => (
                          <option key={x.v} value={x.v}>
                            {x.l}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="whitespace-nowrap">
                      <span className="cell-view">{ajusteView}</span>
                      <input
                        form={formId}
                        name="ajuste"
                        defaultValue={ajusteDefault}
                        className="cell-edit input input-sm w-full"
                        placeholder="10% ou 100"
                      />
                    </td>

                    <td className="whitespace-nowrap">
                      <span className="cell-view font-medium">{money(Number(it.totalItem ?? 0))}</span>
                    </td>

                    <td className="text-right whitespace-nowrap">
                      <details id={detailsId} className="inline-block mr-2 align-middle">
                        <summary className="pill">Editar</summary>
                      </details>

                      <button type="submit" form={formId} className="btn btn-primary btn-sm save-btn align-middle">
                        Salvar
                      </button>

                      <form action={excluirItem} className="inline ml-2 align-middle">
                        <input type="hidden" name="estimativaId" value={estimativaId} />
                        <input type="hidden" name="id" value={it.id} />
                        <ConfirmSubmit className="btn btn-danger btn-sm" message="Excluir este item?">
                          Excluir
                        </ConfirmSubmit>
                      </form>

                      <AutoCloseForm
                        id={formId}
                        action={atualizarItem}
                        rowId={rowId}
                        detailsId={detailsId}
                        className="hidden"
                      >
                        <input type="hidden" name="estimativaId" value={estimativaId} />
                        <input type="hidden" name="id" value={it.id} />
                      </AutoCloseForm>

                      <ToggleRowEditing detailsId={detailsId} rowId={rowId} />
                    </td>
                  </tr>
                );
              })}

              {itens.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center text-zinc-500 py-8">
                    Nenhum item ainda.
                  </td>
                </tr>
              )}
            </tbody>

            {/* ✅ rabinho (totais) */}
            {itens.length > 0 && (
              <tfoot>
                <tr className="tfoot-row">
                  <td colSpan={8} className="tfoot-label">
                    Total real (valor de custo)
                  </td>
                  <td className="tfoot-value">{money(totalSemAjuste)}</td>
                  <td />
                </tr>
                <tr className="tfoot-row">
                  <td colSpan={8} className="tfoot-label">
                    Total (valor de venda)
                  </td>
                  <td className="tfoot-value">{money(totalComAjuste)}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <style>{baseStyles}</style>
      </section>
    </main>
  );
}

const baseStyles = `
:root{
  --border:#e6e7eb; --muted:#f7f7fb;
  --text:#0a0a0a; --subtext:#6b7280;
  --primary:#0f172a; --primary-hover:#0b1222;
  --accent:#2563eb; --ring:rgba(37,99,235,.25);
  --danger-bg:#fff1f2; --danger-text:#be123c;
}
.card{ background:#fff; border:1px solid var(--border); border-radius:12px; padding:12px; box-shadow:0 1px 2px rgba(16,24,40,.04); }
.card-head h2{ margin:0; font-size:.95rem; font-weight:600; color:var(--text); }
.input{ height:36px; padding:0 10px; border:1px solid var(--border); border-radius:10px; outline:none; background:#fff; font-size:.95rem; }
.input:focus{ border-color:var(--accent); box-shadow:0 0 0 3px var(--ring); }
.input-sm{ height:30px; padding:0 8px; font-size:.9rem; }
.btn{ display:inline-flex; align-items:center; justify-content:center; border:1px solid var(--border); border-radius:9999px; padding:0 12px; height:36px; font-weight:500; background:#f9fafb; color:var(--text); cursor:pointer; transition:.15s; font-size:.95rem; text-decoration:none; }
.btn:hover{ background:#f3f4f6; }
.btn-sm{ height:30px; padding:0 10px; font-size:.85rem; }
.btn-primary{ background:var(--primary); border-color:var(--primary); color:#fff; }
.btn-primary:hover{ background:var(--primary-hover); }
.btn-danger{ background:var(--danger-bg); color:var(--danger-text); border-color:#fecdd3; }
.btn-danger:hover{ background:#ffe4e6; }
details>summary::-webkit-details-marker{ display:none; }
details>summary{ list-style:none; }
.pill{ display:inline-block; padding:5px 10px; border-radius:9999px; border:1px solid var(--border); background:var(--muted); color:var(--text); cursor:pointer; font-size:.85rem; }
.pill:hover{ background:#eef2ff; border-color:#dfe3f1; }
.table-wrap{ overflow-x:auto; }
.table{ border-collapse:collapse; width:100%; font-size:.95rem; }
.table thead th{
  background:#f8fafc; color:var(--subtext); text-align:left; font-weight:600; font-size:.85rem;
  padding:10px 12px; border-bottom:1px solid var(--border); white-space:nowrap;
}
.table tbody td{
  padding:10px 12px; border-bottom:1px solid var(--border); vertical-align:middle; color:var(--text);
  white-space:nowrap; text-overflow:ellipsis; overflow:hidden;
}
.table tbody tr:hover td{ background:#fafafa; }
tr.editing td{ white-space:normal; }
.cell-edit{ display:none; }
tr.editing .cell-view{ display:none; }
tr.editing .cell-edit{ display:block; }
td .save-btn{ display:none; }
tr.editing td .save-btn{ display:inline-flex; }

/* ✅ rabinho */
tfoot .tfoot-row td{
  border-top:1px solid var(--border);
  background:#fcfcfd;
  padding:10px 12px;
}
tfoot .tfoot-label{
  text-align:right;
  color:var(--subtext);
  font-weight:600;
}
tfoot .tfoot-value{
  font-weight:700;
  color:var(--text);
  white-space:nowrap;
}
`;
