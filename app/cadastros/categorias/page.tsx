export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import { criarCategoria, excluirCategoria } from "@/actions/categorias";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import {
  PendingFieldset,
  SubmitButton,
  PendingOverlay,
} from "@/components/FormPending";

type PageProps = {
  searchParams?: Promise<{ e?: string; ok?: string }>;
};

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;

  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const me = await prisma.usuario.findUnique({
    where: { supabaseUserId: user.id },
    select: { id: true },
  });
  if (!me) redirect("/login");

  if (params?.e === "NEXT_REDIRECT") {
    redirect("/cadastros/categorias");
  }

  const categorias = await prisma.categoria.findMany({
    where: { usuarioId: me.id },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true },
  });

  const rawErr = params?.e ? decodeURIComponent(params.e) : null;
  const msgErro = rawErr && rawErr !== "NEXT_REDIRECT" ? rawErr : null;
  const ok = params?.ok === "1";

  return (
    <main className="max-w-[980px] mr-auto ml-6 p-6 grid gap-5">
      <h1 className="text-2xl font-semibold text-zinc-900">
        cadastros<span className="text-zinc-400">/</span>categorias
      </h1>

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

      <section className="card relative">
        <div className="card-head mb-2">
          <h2>Nova categoria</h2>
        </div>

        <form
          action={criarCategoria}
          className="grid gap-2 items-center grid-cols-[1fr_auto]"
        >
          <PendingOverlay />
          <PendingFieldset>
            <input
              name="nome"
              placeholder="Nome da categoria (ex: Materiais, Elétrica, Ferramentas...)"
              required
              className="input"
            />
            <SubmitButton className="btn btn-primary">Salvar</SubmitButton>
          </PendingFieldset>
        </form>
      </section>

      <section className="card p-0 overflow-hidden">
        <div className="table-wrap">
          <table className="table w-full">
            <colgroup>
              <col />
              <col style={{ width: "110px" }} />
            </colgroup>
            <thead>
              <tr>
                {["Nome", "Ações"].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {categorias.map((c) => (
                <tr key={c.id}>
                  <td className="font-medium text-zinc-900">{c.nome}</td>

                  <td className="text-right whitespace-nowrap">
                    <form action={excluirCategoria} className="inline-block">
                      <input type="hidden" name="id" value={String(c.id)} />
                      <ConfirmSubmit
                        className="btn btn-danger btn-sm"
                        message="Excluir esta categoria?"
                      >
                        Excluir
                      </ConfirmSubmit>
                    </form>
                  </td>
                </tr>
              ))}

              {categorias.length === 0 && (
                <tr>
                  <td colSpan={2} className="text-center text-zinc-500 py-8">
                    Nenhuma categoria cadastrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

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

          .btn{ display:inline-flex; align-items:center; justify-content:center; border:1px solid var(--border); border-radius:9999px; padding:0 12px; height:36px; font-weight:500; background:#f9fafb; color:var(--text); cursor:pointer; transition:.15s; font-size:.95rem; }
          .btn:hover{ background:#f3f4f6; }
          .btn-sm{ height:30px; padding:0 10px; font-size:.85rem; }
          .btn-primary{ background:var(--primary); border-color:var(--primary); color:#fff; }
          .btn-primary:hover{ background:var(--primary-hover); }
          .btn-danger{ background:var(--danger-bg); color:var(--danger-text); border-color:#fecdd3; }
          .btn-danger:hover{ background:#ffe4e6; }

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
        `}</style>
      </section>

      <p className="text-xs text-zinc-500">
        Dica: nome é único por usuário. Repetir o nome atualiza.
      </p>
    </main>
  );
}
