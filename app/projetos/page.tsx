// app/projetos/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSupabaseServer } from "@/lib/supabaseServer";

import { criarProjetoAndGo, excluirProjeto } from "@/actions/projetos";
import ConfirmSubmit from "@/components/ConfirmSubmit";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ ok?: string; e?: string; q?: string }>;
};

const money = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default async function Page({ searchParams }: PageProps) {
  const sp = await searchParams;
  const q = (sp?.q ?? "").trim();

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

  const whereProjetos = q
    ? {
        usuarioId: me.id,
        OR: [
          { nome: { contains: q, mode: "insensitive" as const } },
          { cliente: { nome: { contains: q, mode: "insensitive" as const } } },
          {
            cliente: {
              responsavel: { contains: q, mode: "insensitive" as const },
            },
          },
        ],
      }
    : { usuarioId: me.id };

  const [clientes, projetos] = await Promise.all([
    prisma.clienteUsuario.findMany({
      where: { usuarioId: me.id },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),

    // ✅ Pega SEM filtrar aprovada
    prisma.projeto.findMany({
      where: whereProjetos,
      orderBy: { id: "desc" },
      include: {
        cliente: { select: { id: true, nome: true, responsavel: true } },
        estimativas: {
          where: { usuarioId: me.id },
          orderBy: { id: "desc" },
          take: 1, // última estimativa do projeto
          include: { itens: { select: { totalItem: true } } },
        },
      },
    }),
  ]);

  const projetosComValor = projetos.map((p) => {
    const est = p.estimativas?.[0];
    const totalUltimaEstimativa =
      est?.itens?.reduce((acc, it) => acc + Number(it.totalItem ?? 0), 0) ?? 0;

    // ✅ regra de exibição:
    // mostra valor só quando projeto estiver aprovado
    return {
      id: p.id,
      nome: p.nome,
      status: p.status,
      clienteNome: p.cliente?.nome ?? null,
      responsavel: p.cliente?.responsavel ?? null,
      totalAprovado: totalUltimaEstimativa > 0 ? totalUltimaEstimativa : null,
    };
  });

  return (
    <main className="max-w-[1080px] mr-auto ml-6 p-6 grid gap-5">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">Projetos</h1>
        <Link href="/" className="btn btn-sm">
          Dashboard
        </Link>
      </header>

      {!!sp?.ok && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
          ✅ Ação realizada com sucesso.
        </div>
      )}
      {!!sp?.e && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-800">
          ❌ {sp.e}
        </div>
      )}

      <section className="card">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="card-head">
            <h2>Novo projeto</h2>
          </div>

          <form
            action="/projetos"
            method="get"
            className="flex items-center gap-2"
          >
            <input
              name="q"
              defaultValue={q}
              placeholder="Pesquisar por projeto ou cliente..."
              className="input"
              style={{ width: 320 }}
            />
            <button className="btn btn-sm" type="submit">
              Buscar
            </button>
            {!!q && (
              <Link href="/projetos" className="btn btn-sm">
                Limpar
              </Link>
            )}
          </form>
        </div>

        <form
          action={criarProjetoAndGo}
          className="mt-3 flex items-center gap-2 flex-wrap"
        >
          <input
            name="nome"
            placeholder="Nome do projeto"
            required
            className="input"
            style={{ width: 260 }}
          />

          <select
            name="clienteId"
            className="input"
            defaultValue=""
            style={{ width: 260 }}
          >
            <option value="">Cliente (opcional)</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>

          <button className="btn btn-primary" type="submit">
            Criar e abrir itens
          </button>
        </form>
      </section>

      <section className="card p-0 overflow-hidden">
        <div className="table-wrap">
          <table className="table w-full">
            <colgroup>
              {[
                { w: "64px" },
                { w: "30%" },
                { w: "22%" },
                { w: "20%" },
                { w: "140px" },
                { w: "140px" },
                { w: "180px" },
              ].map((c, i) => (
                <col key={i} style={c.w ? { width: c.w } : undefined} />
              ))}
            </colgroup>

            <thead>
              <tr>
                {[
                  "ID",
                  "Projeto",
                  "Cliente",
                  "Responsável",
                  "Valor",
                  "Status",
                  "Ações",
                ].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {projetosComValor.map((p) => (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td className="font-medium text-zinc-900">{p.nome}</td>
                  <td>{p.clienteNome ?? "—"}</td>
                  <td>{p.responsavel ?? "—"}</td>
                  <td className="whitespace-nowrap">
                    {p.totalAprovado != null && p.totalAprovado > 0
                      ? money(p.totalAprovado)
                      : "—"}
                  </td>
                  <td>{p.status}</td>
                  <td className="text-right whitespace-nowrap">
                    <Link
                      href={`/projetos/${p.id}/itens`}
                      className="btn btn-sm mr-2"
                    >
                      Abrir
                    </Link>

                    <form
                      action={excluirProjeto}
                      className="inline align-middle"
                    >
                      <input type="hidden" name="id" value={p.id} />
                      <ConfirmSubmit
                        className="btn btn-danger btn-sm"
                        message="Excluir este projeto?"
                      >
                        Excluir
                      </ConfirmSubmit>
                    </form>
                  </td>
                </tr>
              ))}

              {projetosComValor.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-zinc-500 py-8">
                    Nenhum projeto encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <style>{`
          :root{ --border:#e6e7eb; --muted:#f7f7fb; --text:#0a0a0a; --subtext:#6b7280;
            --primary:#0f172a; --primary-hover:#0b1222; --accent:#2563eb; --ring:rgba(37,99,235,.25);
            --danger-bg:#fff1f2; --danger-text:#be123c;
          }
          .card{ background:#fff; border:1px solid var(--border); border-radius:12px; padding:12px; box-shadow:0 1px 2px rgba(16,24,40,.04); }
          .card-head h2{ margin:0; font-size:.95rem; font-weight:600; color:var(--text); }
          .input{ height:36px; padding:0 10px; border:1px solid var(--border); border-radius:10px; outline:none; background:#fff; font-size:.95rem; }
          .input:focus{ border-color:var(--accent); box-shadow:0 0 0 3px var(--ring); }
          .btn{ display:inline-flex; align-items:center; justify-content:center; border:1px solid var(--border); border-radius:9999px; padding:0 12px; height:36px; font-weight:500; background:#f9fafb; color:var(--text); cursor:pointer; transition:.15s; font-size:.95rem; text-decoration:none; }
          .btn:hover{ background:#f3f4f6; }
          .btn-sm{ height:30px; padding:0 10px; font-size:.85rem; }
          .btn-primary{ background:var(--primary); border-color:var(--primary); color:#fff; }
          .btn-primary:hover{ background:var(--primary-hover); }
          .btn-danger{ background:var(--danger-bg); color:var(--danger-text); border-color:#fecdd3; }
          .btn-danger:hover{ background:#ffe4e6; }
          .table-wrap{ overflow-x:auto; }
          .table{ border-collapse:collapse; width:100%; font-size:.95rem; }
          .table thead th{ background:#f8fafc; color:var(--subtext); text-align:left; font-weight:600; font-size:.85rem; padding:10px 12px; border-bottom:1px solid var(--border); white-space:nowrap; }
          .table tbody td{ padding:10px 12px; border-bottom:1px solid var(--border); vertical-align:middle; color:var(--text); white-space:nowrap; text-overflow:ellipsis; overflow:hidden; }
          .table tbody tr:hover td{ background:#fafafa; }
        `}</style>
      </section>
    </main>
  );
}
