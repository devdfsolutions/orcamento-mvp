// app/cadastros/vinculos/page.tsx
import React from "react";
import { prisma } from "@/lib/prisma";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import { upsertVinculo, excluirVinculo } from "@/actions/vinculos";
import InlineVinculoRow from "@/components/InlineVinculoRow";
import { PendingOverlay, PendingFieldset, SubmitButton } from "@/components/FormPending";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams?: { e?: string; ok?: string };
}) {
  // auth
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

  if (searchParams?.e === "NEXT_REDIRECT") {
    redirect("/cadastros/vinculos");
  }

  // data
  const [fornecedores, produtos, vinculos] = await Promise.all([
    prisma.fornecedor.findMany({
      where: { usuarioId: me.id },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
    prisma.produtoServico.findMany({
      where: { usuarioId: me.id },
      orderBy: { nome: "asc" },
      select: {
        id: true,
        nome: true,
        unidade: { select: { sigla: true } },
      },
    }),
    prisma.fornecedorProduto.findMany({
      where: { usuarioId: me.id },
      orderBy: [{ produto: { nome: "asc" } }, { fornecedor: { nome: "asc" } }],
      include: {
        fornecedor: { select: { id: true, nome: true } },
        produto: {
          select: { id: true, nome: true, unidade: { select: { sigla: true } } },
        },
      },
    }),
  ]);

  const rawErr = searchParams?.e ?? null;
  const msgErro =
    rawErr && rawErr !== "NEXT_REDIRECT" ? decodeURIComponent(rawErr) : null;
  const ok = searchParams?.ok === "1";

  return (
    <main className="max-w-[1200px] mr-auto ml-6 p-6 grid gap-5">
      <h1 className="text-2xl font-semibold text-zinc-900">
        Cadastros <span className="text-zinc-400">/</span> Vínculos Fornecedor ↔ Produto
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

      {/* form */}
      <section className="card relative">
        <div className="card-head mb-2">
          <h2>Criar/Atualizar vínculo (upsert)</h2>
        </div>

        <form action={upsertVinculo} className="grid gap-3">
          <PendingOverlay />
          <PendingFieldset>
            {/* linha 1 */}
            <div className="grid gap-2 grid-cols-[2fr_2fr_1fr_3fr]">
              <select name="fornecedorId" defaultValue="" required className="input h-9">
                <option value="" disabled>Fornecedor</option>
                {fornecedores.map((f) => (
                  <option key={f.id} value={f.id}>{f.nome}</option>
                ))}
              </select>

              <select name="produtoId" defaultValue="" required className="input h-9">
                <option value="" disabled>Produto/Serviço</option>
                {produtos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} {p.unidade?.sigla ? `(${p.unidade.sigla})` : ""}
                  </option>
                ))}
              </select>

              <input
                name="dataUltAtual"
                placeholder="Data (DD/MM/AAAA)"
                className="input"
                inputMode="numeric"
              />
              <input
                name="observacao"
                placeholder="Observação (opcional)"
                className="input"
              />
            </div>

            {/* linha 2 */}
            <div className="grid gap-2 grid-cols-6">
              <input name="precoMatP1" placeholder="Materiais P1 (R$)" inputMode="decimal" className="input" />
              <input name="precoMatP2" placeholder="Materiais P2 (R$)" inputMode="decimal" className="input" />
              <input name="precoMatP3" placeholder="Materiais P3 (R$)" inputMode="decimal" className="input" />
              <input name="precoMoM1"  placeholder="Mão de Obra M1 (R$)" inputMode="decimal" className="input" />
              <input name="precoMoM2"  placeholder="Mão de Obra M2 (R$)" inputMode="decimal" className="input" />
              <input name="precoMoM3"  placeholder="Mão de Obra M3 (R$)" inputMode="decimal" className="input" />
            </div>

            <div className="flex justify-end">
              <SubmitButton className="btn btn-primary">Salvar</SubmitButton>
            </div>
          </PendingFieldset>
        </form>

        <p className="mt-2 text-xs text-zinc-500">
          Dica: selecione o mesmo fornecedor+produto e preencha novos valores para atualizar (upsert).
        </p>
      </section>

      {/* lista */}
      <section className="card p-0 overflow-hidden">
        <div className="table-wrap">
          <table className="table w-full">
            {/* sem colgroup fixo para evitar corte; deixa o browser dimensionar */}
            <thead>
              <tr>
                <th>Produto/Serviço</th>
                <th>Fornecedor</th>
                <th className="text-center">UM</th>
                <th className="text-right">P1</th>
                <th className="text-right">P2</th>
                <th className="text-right">P3</th>
                <th className="text-right">M1</th>
                <th className="text-right">M2</th>
                <th className="text-right">M3</th>
                <th>Atualização</th>
                <th>Obs</th>
                <th style={{ width: 140 }}></th>
              </tr>
            </thead>

            <tbody>
              {vinculos.map((v) => {
                const safeV = {
                  ...v,
                  precoMatP1: v.precoMatP1 != null ? Number(v.precoMatP1) : null,
                  precoMatP2: v.precoMatP2 != null ? Number(v.precoMatP2) : null,
                  precoMatP3: v.precoMatP3 != null ? Number(v.precoMatP3) : null,
                  precoMoM1: v.precoMoM1 != null ? Number(v.precoMoM1) : null,
                  precoMoM2: v.precoMoM2 != null ? Number(v.precoMoM2) : null,
                  precoMoM3: v.precoMoM3 != null ? Number(v.precoMoM3) : null,
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
                  <td colSpan={12} className="text-center text-zinc-500 py-8">
                    Nenhum vínculo cadastrado.
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
          }
          .card{ background:var(--bg); border:1px solid var(--border); border-radius:12px; padding:12px; box-shadow:0 1px 2px rgba(16,24,40,.04); }
          .card-head h2{ margin:0; font-size:.95rem; font-weight:600; color:var(--text); }

          .input{ height:36px; padding:0 10px; border:1px solid var(--border); border-radius:10px; outline:none; background:#fff; font-size:.95rem; }
          .input:focus{ border-color:var(--accent); box-shadow:0 0 0 3px var(--ring); }

          .btn{ display:inline-flex; align-items:center; justify-content:center; border:1px solid var(--border); border-radius:9999px; padding:0 12px; height:36px; font-weight:500; background:#f9fafb; color:var(--text); cursor:pointer; transition:.15s; font-size:.95rem; }
          .btn:hover{ background:#f3f4f6; }
          .btn-primary{ background:var(--primary); border-color:var(--primary); color:#fff; }
          .btn-primary:hover{ background:var(--primary-hover); }

          .table-wrap{ overflow-x:auto; }
          .table{ border-collapse:collapse; table-layout:auto; width:100%; font-size:.95rem; }
          .table thead th{
            background:#f8fafc; color:var(--subtext); text-align:left; font-weight:600; font-size:.85rem;
            padding:10px 12px; border-bottom:1px solid var(--border); white-space:nowrap;
          }
          .table thead th.text-right{ text-align:right; }
          .table thead th.text-center{ text-align:center; }
          .table tbody td{
            padding:10px 12px; border-bottom:1px solid var(--border); vertical-align:middle; color:var(--text);
            /* >>> sem corte: mostra tudo */
            white-space:normal; overflow:visible; text-overflow:clip; word-break:break-word;
          }
          .table tbody tr:hover td{ background:#fafafa; }
        `}</style>
      </section>
    </main>
  );
}
