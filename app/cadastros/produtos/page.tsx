// ===== Config de runtime =====
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { prisma } from "@/lib/prisma";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import AutoCloseForm from "@/components/AutoCloseForm";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import ToggleRowEditing from "@/components/ToggleRowEditing";
import {
  criarProduto,
  atualizarProduto,
  excluirProduto,
} from "@/actions/produtos";
import {
  PendingFieldset,
  PendingOverlay,
  SubmitButton,
} from "@/components/FormPending";

/* ===== Helpers ===== */
function money(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
const tipoLabel = (t?: string | null) =>
  t === "PRODUTO" ? "Produto" : t === "SERVICO" ? "Serviço" : "Ambos";

type VincForn = {
  produtoId: number;
  fornecedorNome: string;
  precoMatP1: number | null;
  precoMatP2: number | null;
  precoMatP3: number | null;
  precoMoM1: number | null;
  precoMoM2: number | null;
  precoMoM3: number | null;
};

function pickMinMaxByTipo(
  vincs: VincForn[],
  tipo: "PRODUTO" | "SERVICO" | "AMBOS" | null | undefined
) {
  let min: { preco: number; fornecedor: string } | undefined;
  let max: { preco: number; fornecedor: string } | undefined;
  const useMO = tipo === "SERVICO";

  for (const v of vincs) {
    const cand = useMO
      ? [v.precoMoM1, v.precoMoM2, v.precoMoM3]
      : [v.precoMatP1, v.precoMatP2, v.precoMatP3];

    for (const p of cand) {
      const price = Number(p);
      if (!Number.isFinite(price)) continue;
      if (!min || price < min.preco) min = { preco: price, fornecedor: v.fornecedorNome };
      if (!max || price > max.preco) max = { preco: price, fornecedor: v.fornecedorNome };
    }
  }
  return { min, max };
}

/* ===== Página ===== */
export default async function Page({
  searchParams,
}: { searchParams?: { e?: string; ok?: string } }) {
  // Auth + "me"
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const me = await prisma.usuario.findUnique({
    where: { supabaseUserId: user.id },
    select: { id: true },
  });
  if (!me) redirect("/login");

  // limpar URL se vier com ?e=NEXT_REDIRECT
if (searchParams?.e === "NEXT_REDIRECT") {
  redirect("/cadastros/produtos");
}

  const [unidades, produtos, vinculos] = await Promise.all([
    prisma.unidadeMedida.findMany({
      where: { usuarioId: me.id },
      orderBy: { sigla: "asc" },
      select: { id: true, sigla: true, nome: true },
    }),
    prisma.produtoServico.findMany({
      where: { usuarioId: me.id },
      orderBy: [{ nome: "asc" }],
      select: {
        id: true,
        nome: true,
        categoria: true,
        tipo: true,
        unidadeMedidaId: true,
        unidade: { select: { id: true, sigla: true, nome: true } },
      },
    }),
    prisma.fornecedorProduto.findMany({
      where: { usuarioId: me.id },
      include: { fornecedor: { select: { nome: true } } },
    }),
  ]);

  const mapPorProduto = new Map<number, VincForn[]>();
  for (const v of vinculos) {
    const arr = mapPorProduto.get(v.produtoId) ?? [];
    arr.push({
      produtoId: v.produtoId,
      fornecedorNome: v.fornecedor.nome,
      precoMatP1: v.precoMatP1 == null ? null : Number(v.precoMatP1),
      precoMatP2: v.precoMatP2 == null ? null : Number(v.precoMatP2),
      precoMatP3: v.precoMatP3 == null ? null : Number(v.precoMatP3),
      precoMoM1: v.precoMoM1 == null ? null : Number(v.precoMoM1),
      precoMoM2: v.precoMoM2 == null ? null : Number(v.precoMoM2),
      precoMoM3: v.precoMoM3 == null ? null : Number(v.precoMoM3),
    });
    mapPorProduto.set(v.produtoId, arr);
  }

  const rawErr = searchParams?.e ?? null;
  const msgErro = rawErr && rawErr !== "NEXT_REDIRECT" ? decodeURIComponent(rawErr) : null;
  const ok = searchParams?.ok === "1";

  return (
    <main className="max-w-[1100px] mr-auto ml-6 p-6 grid gap-5">
      <h1 className="text-2xl font-semibold text-zinc-900">
        Cadastros <span className="text-zinc-400">/</span> Produtos & Serviços
      </h1>

      {/* alertas */}
      {msgErro && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-800 px-3 py-2 text-sm">
          {msgErro}
        </div>
      )}
      {ok && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 px-3 py-2 text-sm">
          Salvo com sucesso.
        </div>
      )}

      {/* Novo produto/serviço */}
      <section className="card relative">
        <div className="card-head mb-2">
          <h2>Novo produto/serviço</h2>
        </div>

        <form action={criarProduto} className="grid gap-2 grid-cols-[1fr_140px_180px_1fr_auto] items-center">
          <PendingOverlay />
          <PendingFieldset>
            <input name="nome" placeholder="Nome" required className="input" />

            <select name="tipo" defaultValue="AMBOS" required className="input">
              <option value="PRODUTO">Produto</option>
              <option value="SERVICO">Serviço</option>
              <option value="AMBOS">Ambos</option>
            </select>

            <select name="unidadeMedidaId" defaultValue="" required className="input">
              <option value="" disabled>Selecione UM</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.sigla} — {u.nome}
                </option>
              ))}
            </select>

            <input name="categoria" placeholder="Categoria (opcional)" className="input" />

            <SubmitButton className="btn btn-primary">Salvar</SubmitButton>
          </PendingFieldset>
        </form>
      </section>

      {/* Lista */}
      <section className="card p-0 overflow-hidden">
        <div className="table-wrap">
          <table className="table w-full">
            <colgroup>
              <col style={{ width: "60px" }} />   {/* ID */}
              <col style={{ width: "30%" }} />    {/* Nome */}
              <col style={{ width: "30%" }} />    {/* Tipo */}
              <col style={{ width: "15%" }} />     {/* UM */}
              <col style={{ width: "35%" }} />    {/* Categoria */}
              <col style={{ width: "25%" }} />    {/* P1 */}
              <col style={{ width: "40%" }} />    {/* Forn P1 */}
              <col style={{ width: "25%" }} />    {/* P3 */}
              <col style={{ width: "40%" }} />    {/* Forn P3 */}
              <col style={{ width: "120px" }} />  {/* Ações */}
            </colgroup>

            <thead>
              <tr>
                {["ID","Nome","Tipo","UM","Categoria","P1 (menor)","Fornecedor (P1)","P3 (maior)","Fornecedor (P3)","Ações"].map((h)=>(
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {produtos.map((p) => {
                const vincs = mapPorProduto.get(p.id) ?? [];
                const { min, max } = pickMinMaxByTipo(vincs, (p.tipo as any) ?? "AMBOS");
                const formId = `edit-${p.id}`;
                const detailsId = `det-${p.id}`;
                const rowId = `row-${p.id}`;

                return (
                  <tr key={p.id} id={rowId}>
                    <td><span className="cell-view">{p.id}</span></td>

                    <td>
                      <span className="cell-view font-medium text-zinc-900">{p.nome}</span>
                      <input form={formId} name="nome" defaultValue={p.nome} required className="cell-edit input input-sm w-full" />
                    </td>

                    <td>
                      <span className="cell-view">{tipoLabel(p.tipo)}</span>
                      <select form={formId} name="tipo" defaultValue={String(p.tipo ?? "AMBOS")} required className="cell-edit input input-sm w-full">
                        <option value="PRODUTO">Produto</option>
                        <option value="SERVICO">Serviço</option>
                        <option value="AMBOS">Ambos</option>
                      </select>
                    </td>

                    <td>
                      <span className="cell-view">{p.unidade?.sigla}</span>
                      <select form={formId} name="unidadeMedidaId" defaultValue={String(p.unidadeMedidaId)} required className="cell-edit input input-sm w-full">
                        {unidades.map((u)=>(
                          <option key={u.id} value={u.id}>{u.sigla}</option>
                        ))}
                      </select>
                    </td>

                    <td>
                      <span className="cell-view">{p.categoria ?? "—"}</span>
                      <input form={formId} name="categoria" defaultValue={p.categoria ?? ""} placeholder="Categoria" className="cell-edit input input-sm w-full" />
                    </td>

                    {/* preços min/max */}
                    <td className="text-right">{min ? money(min.preco) : "—"}</td>
                    <td className="break-words">{min?.fornecedor ?? "—"}</td>
                    <td className="text-right">{max ? money(max.preco) : "—"}</td>
                    <td className="break-words">{max?.fornecedor ?? "—"}</td>

                    <td className="text-right whitespace-nowrap">
                      <details id={detailsId} className="inline-block mr-2 align-middle">
                        <summary className="pill">Editar</summary>
                      </details>

                      <button type="submit" form={formId} className="btn btn-primary btn-sm save-btn align-middle">
                        Salvar
                      </button>

                      <form action={excluirProduto} className="inline ml-2 align-middle">
                        <input type="hidden" name="id" value={p.id} />
                        <ConfirmSubmit className="btn btn-danger btn-sm" message="Excluir este item?">
                          Excluir
                        </ConfirmSubmit>
                      </form>

                      {/* form oculto para receber os inputs por 'form' */}
                      <AutoCloseForm id={formId} action={atualizarProduto} className="hidden">
                        <input type="hidden" name="id" value={p.id} />
                      </AutoCloseForm>

                      <ToggleRowEditing detailsId={detailsId} rowId={rowId} />
                    </td>
                  </tr>
                );
              })}

              {produtos.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center text-zinc-500 py-8">
                    Nenhum produto/serviço cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* estilos locais (tokens + tabela compacta + inline edit) */}
        <style>{`
          :root{
            --bg:#fff; --border:#e6e7eb; --muted:#f7f7fb;
            --text:#0a0a0a; --subtext:#6b7280;
            --primary:#0f172a; --primary-hover:#0b1222;
            --accent:#2563eb; --ring:rgba(37,99,235,.25);
            --danger-bg:#fff1f2; --danger-text:#be123c;
          }
          .card{ background:var(--bg); border:1px solid var(--border); border-radius:12px; padding:12px; box-shadow:0 1px 2px rgba(16,24,40,.04); }
          .card-head h2{ margin:0; font-size:.95rem; font-weight:600; color:var(--text); }

          .input{ height:36px; padding:0 10px; border:1px solid var(--border); border-radius:10px; outline:none; background:#fff; font-size:.95rem; }
          .input:focus{ border-color:var(--accent); box-shadow:0 0 0 3px var(--ring); }
          .input-sm{ height:30px; padding:0 8px; font-size:.9rem; }

          .btn{ display:inline-flex; align-items:center; justify-content:center; border:1px solid var(--border); border-radius:9999px; padding:0 12px; height:36px; font-weight:500; background:#f9fafb; color:var(--text); cursor:pointer; transition:.15s; font-size:.95rem; }
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

          .table-wrap{ overflow-x:hidden; }
          .table{ border-collapse:collapse; table-layout:fixed; width:100%; font-size:.95rem; }
          .table thead th{
            background:#f8fafc; color:var(--subtext); text-align:left; font-weight:600; font-size:.85rem;
            padding:10px 12px; border-bottom:1px solid var(--border);
          }
          .table tbody td{
            padding:10px 12px; border-bottom:1px solid var(--border); vertical-align:middle; color:var(--text);
            overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
          }
          .table tbody tr:hover td{ background:#fafafa; }

          /* inline edit */
          .cell-edit{ display:none; }
          tr.editing .cell-view{ display:none; }
          tr.editing .cell-edit{ display:block; }
          td .save-btn{ display:none; }
          tr.editing td .save-btn{ display:inline-flex; }

          /* inputs não estouram a célula */
          .table input, .table select{
            width:100%; max-width:100%; min-width:0; box-sizing:border-box;
          }
        `}</style>
      </section>
    </main>
  );
}
