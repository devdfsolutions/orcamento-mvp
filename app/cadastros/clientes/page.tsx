import React from "react";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import AutoCloseForm from "@/components/AutoCloseForm";
import { prisma } from "@/lib/prisma";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import {
  criarClienteUsuario,
  atualizarClienteUsuario,
  excluirClienteUsuario,
} from "@/actions/clientes";
import MaskedInput from "@/components/MaskedInput";
import ToggleRowEditing from "@/components/ToggleRowEditing";
import { PendingFieldset, SubmitButton, PendingOverlay } from "@/components/FormPending";

export const dynamic = "force-dynamic";

/* ===== helpers ===== */
const digits = (s?: string | null) => (s ? s.replace(/\D+/g, "") : "");
const formatCPF = (v?: string | null) => {
  const d = digits(v);
  if (d.length !== 11) return v || "—";
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
};
const formatCNPJ = (v?: string | null) => {
  const d = digits(v);
  if (d.length !== 14) return v || "—";
  return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
};

type PageProps = { searchParams?: { p?: string } };

export default async function Page({ searchParams }: PageProps) {
  // auth
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const me = await prisma.usuario.findUnique({
    where: { supabaseUserId: user.id },
    select: { id: true },
  });
  if (!me) redirect("/login");

  // paginação
  const pageSize = 50;
  const page = Math.max(1, Number(searchParams?.p ?? "1"));
  const skip = (page - 1) * pageSize;

  const [total, clientes] = await Promise.all([
    prisma.clienteUsuario.count({ where: { usuarioId: me.id } }),
    prisma.clienteUsuario.findMany({
      where: { usuarioId: me.id },
      orderBy: { nome: "asc" },
      select: {
        id: true,
        nome: true,
        cpf: true,
        cnpj: true,
        email: true,
        telefone: true,
        endereco: true,
      },
      take: pageSize,
      skip,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <main className="max-w-[980px] mr-auto ml-6 p-6 grid gap-5">
      <h1 className="text-2xl font-semibold text-zinc-900">
        Cadastros <span className="text-zinc-400">/</span> Clientes
      </h1>

      {/* card criar */}
      <section className="card relative">
        <div className="card-head mb-2">
          <h2>Novo cliente</h2>
        </div>

        <form action={criarClienteUsuario} className="grid gap-2 md:grid-cols-4">
          {/* overlay bloqueia clicks durante submit */}
          <PendingOverlay />

          <PendingFieldset>
            <input type="hidden" name="usuarioId" value={me.id} />

            <input name="nome" placeholder="Nome" required className="input" />

            <MaskedInput
              name="cpf"
              placeholder="CPF (opcional)"
              inputMode="numeric"
              maxLength={14}
              mask="cpf"
              className="input"
            />
            <MaskedInput
              name="cnpj"
              placeholder="CNPJ (opcional)"
              inputMode="numeric"
              maxLength={18}
              mask="cnpj"
              className="input"
            />
            <input name="email" placeholder="E-mail (opcional)" type="email" className="input" />
            <input name="telefone" placeholder="Telefone (opcional)" className="input" />
            <input name="endereco" placeholder="Endereço (opcional)" className="input md:col-span-2" />

            <div className="md:col-span-4 flex justify-start pt-1">
              <SubmitButton className="btn btn-primary">Adicionar Novo</SubmitButton>
            </div>
          </PendingFieldset>
        </form>
      </section>

      {/* tabela */}
      <section className="card p-0 overflow-hidden">
        <div className="table-wrap">
          <table className="table w-full">
            <colgroup>
              <col style={{ width: "56px" }} /> {/* ID */}
              <col style={{ width: "50%" }} /> {/* Nome */}
              <col style={{ width: "45%" }} /> {/* CPF */}
              <col style={{ width: "50%" }} /> {/* CNPJ */}
              <col style={{ width: "40%" }} /> {/* e-mail */}
              <col style={{ width: "30%" }} /> {/* telefone */}
              <col style={{ width: "45%" }} /> {/* endereço */}
              <col style={{ width: "110px" }} /> {/* ações */}
            </colgroup>

            <thead>
              <tr>
                {["ID","Nome","CPF","CNPJ","E-mail","Telefone","Endereço","Ações"].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {clientes.map((c) => {
                const detailsId = `det-${c.id}`;
                const rowId = `row-${c.id}`;
                const formId = `edit-${c.id}`;
                return (
                  <tr key={c.id} id={rowId}>
                    <td><span className="cell-view">{c.id}</span></td>

                    <td>
                      <span className="cell-view font-medium text-zinc-900">{c.nome}</span>
                      <input form={formId} name="nome" defaultValue={c.nome} className="cell-edit input input-sm w-full" required />
                    </td>

                    <td>
                      <span className="cell-view">{formatCPF(c.cpf)}</span>
                      <MaskedInput form={formId} name="cpf" defaultValue={c.cpf ?? ""} placeholder="CPF" inputMode="numeric" maxLength={14} mask="cpf" className="cell-edit input input-sm w-full" />
                    </td>

                    <td>
                      <span className="cell-view">{formatCNPJ(c.cnpj)}</span>
                      <MaskedInput form={formId} name="cnpj" defaultValue={c.cnpj ?? ""} placeholder="CNPJ" inputMode="numeric" maxLength={18} mask="cnpj" className="cell-edit input input-sm w-full" />
                    </td>

                    <td className="break-words">
                      <span className="cell-view">{c.email ?? "—"}</span>
                      <input form={formId} name="email" defaultValue={c.email ?? ""} placeholder="E-mail" type="email" className="cell-edit input input-sm w-full" />
                    </td>

                    <td className="whitespace-nowrap">
                      <span className="cell-view">{c.telefone ?? "—"}</span>
                      <input form={formId} name="telefone" defaultValue={c.telefone ?? ""} placeholder="Telefone" className="cell-edit input input-sm w-full" />
                    </td>

                    <td className="break-words">
                      <span className="cell-view">{c.endereco ?? "—"}</span>
                      <input form={formId} name="endereco" defaultValue={c.endereco ?? ""} placeholder="Endereço" className="cell-edit input input-sm w-full" />
                    </td>

                    <td className="text-right whitespace-nowrap">
                      <details id={detailsId} className="inline-block mr-2 align-middle">
                        <summary className="pill">Editar</summary>
                      </details>

                      <button type="submit" form={formId} className="btn btn-primary btn-sm save-btn align-middle">
                        Salvar
                      </button>

                      <form action={excluirClienteUsuario} className="inline ml-2 align-middle">
                        <input type="hidden" name="id" value={c.id} />
                        <ConfirmSubmit className="btn btn-danger btn-sm" message="Excluir este cliente?">
                          Excluir
                        </ConfirmSubmit>
                      </form>

                      <AutoCloseForm id={formId} action={atualizarClienteUsuario} className="hidden">
                        <input type="hidden" name="id" value={c.id} />
                      </AutoCloseForm>

                      <ToggleRowEditing detailsId={detailsId} rowId={rowId} />
                    </td>
                  </tr>
                );
              })}

              {clientes.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center text-zinc-500 py-8">
                    Nenhum cliente cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* estilos compactos + anti-overflow + tokens + btn/spinner herdados */}
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

          .table-wrap{ overflow-x: hidden; }
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

          .table input, .table .input{ width:100%; max-width:100%; min-width:0; box-sizing:border-box; }
          tr.editing td{ white-space:normal; }

          .cell-edit{ display:none; }
          tr.editing .cell-view{ display:none; }
          tr.editing .cell-edit{ display:block; }

          td .save-btn{ display:none; }
          tr.editing td .save-btn{ display:inline-flex; }
        `}</style>
      </section>

      {/* paginação */}
      <nav className="flex items-center justify-start gap-2">
        <span className="text-sm text-zinc-500">
          {total} registro(s) • página {page} de {totalPages}
        </span>
        <a href={`?p=${Math.max(1, page - 1)}`} aria-disabled={page <= 1} className={`btn btn-sm ${page <= 1 ? "opacity-40 pointer-events-none" : ""}`}>
          Anterior
        </a>
        <a href={`?p=${Math.min(totalPages, page + 1)}`} aria-disabled={page >= totalPages} className={`btn btn-sm ${page >= totalPages ? "opacity-40 pointer-events-none" : ""}`}>
          Próxima
        </a>
      </nav>
    </main>
  );
}
