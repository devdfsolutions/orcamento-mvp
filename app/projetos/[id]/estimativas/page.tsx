export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { aprovarEstimativa } from "@/actions/estimativas";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ e?: string; ok?: string }>;
};

const money = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default async function Page({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const projetoId = Number(id);
  if (!projetoId) redirect("/projetos?e=Projeto inválido");

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
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

  const estimativas = await prisma.estimativa.findMany({
    where: { usuarioId: me.id, projetoId },
    orderBy: { id: "desc" },
    include: { itens: { select: { totalItem: true } } },
  });

  const rows = estimativas.map((e) => {
    const total = e.itens.reduce((acc, it) => acc + Number(it.totalItem ?? 0), 0);
    return { ...e, total };
  });

  const totalGeral = rows.reduce((acc, r) => acc + r.total, 0);
  const aprovadas = rows.filter((r) => r.aprovada).length;

  return (
    <main className="max-w-[980px] mr-auto ml-6 p-6 grid gap-5">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Estimativas — Projeto #{projeto.id}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            {projeto.nome} • Cliente: <span className="text-zinc-800">{projeto.cliente?.nome ?? "—"}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link className="btn btn-sm" href={`/projetos/${projeto.id}/itens`}>Itens</Link>
          <Link className="btn btn-sm" href="/projetos">Projetos</Link>
        </div>
      </header>

      {!!sp?.e && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-800">
          ❌ {sp.e}
        </div>
      )}
      {!!sp?.ok && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
          ✅ OK
        </div>
      )}

      <section className="card">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-zinc-500">Total somado (todas estimativas)</div>
            <div className="text-3xl font-semibold">{money(totalGeral)}</div>
          </div>
          <div className="text-sm text-zinc-500 text-right">
            Aprovadas: <span className="text-zinc-800 font-medium">{aprovadas}</span> / {rows.length}
          </div>
        </div>
      </section>

      <section className="card p-0 overflow-hidden">
        <div className="table-wrap">
          <table className="table w-full">
            <colgroup>
              {[{ w: "80px" }, { w: "220px" }, { w: "140px" }, { w: "160px" }].map((c, i) => (
                <col key={i} style={c.w ? { width: c.w } : undefined} />
              ))}
            </colgroup>

            <thead>
              <tr>
                {["ID", "Nome", "Total", "Aprovada"].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map((e) => (
                <tr key={e.id}>
                  <td>{e.id}</td>
                  <td className="font-medium text-zinc-900">{e.nome}</td>
                  <td className="whitespace-nowrap">{money(e.total)}</td>
                  <td className="text-right whitespace-nowrap">
                    <form action={aprovarEstimativa} className="inline">
                      <input type="hidden" name="estimativaId" value={e.id} />
                      <button
                        type="submit"
                        className={`btn btn-sm ${e.aprovada ? "btn-primary" : ""}`}
                        title="Alternar aprovação"
                      >
                        {e.aprovada ? "Aprovada" : "Aprovar"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}

              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center text-zinc-500 py-8">
                    Nenhuma estimativa ainda.
                  </td>
                </tr>
              )}
            </tbody>
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
}
.card{ background:#fff; border:1px solid var(--border); border-radius:12px; padding:12px; box-shadow:0 1px 2px rgba(16,24,40,.04); }
.btn{ display:inline-flex; align-items:center; justify-content:center; border:1px solid var(--border); border-radius:9999px; padding:0 12px; height:36px; font-weight:500; background:#f9fafb; color:var(--text); cursor:pointer; transition:.15s; font-size:.95rem; text-decoration:none; }
.btn:hover{ background:#f3f4f6; }
.btn-sm{ height:30px; padding:0 10px; font-size:.85rem; }
.btn-primary{ background:var(--primary); border-color:var(--primary); color:#fff; }
.btn-primary:hover{ background:var(--primary-hover); }
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
`;
