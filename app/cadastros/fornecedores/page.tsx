export const dynamic = "force-dynamic";

import ConfirmSubmit from "@/components/ConfirmSubmit";
import AutoCloseForm from "@/components/AutoCloseForm";
import DocInput from "@/components/DocInput";
import ToggleRowEditing from "@/components/ToggleRowEditing";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import {
  criarFornecedor,
  atualizarFornecedor,
  excluirFornecedor,
} from "@/actions/fornecedores";
import { getAuthUser } from "@/lib/authUser";
import {
  PendingFieldset,
  PendingOverlay,
  SubmitButton,
} from "@/components/FormPending";

function docMask(v?: string | null) {
  if (!v) return "—";
  const d = String(v).replace(/\D+/g, "");
  if (d.length === 11) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  if (d.length === 14) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  return v;
}

type SP = Record<string, string | string[] | undefined>;
type Props = { searchParams?: Promise<SP> };

export default async function Page({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const me = await getAuthUser(true);
  if (!me) redirect("/login");

  const e = Array.isArray(sp.e) ? sp.e[0] : sp.e;
  const okParam = Array.isArray(sp.ok) ? sp.ok[0] : sp.ok;

  // limpa URL se vier com NEXT_REDIRECT
  if (e === "NEXT_REDIRECT") {
    redirect("/cadastros/fornecedores");
  }

  const fornecedores = await prisma.fornecedor.findMany({
    where: { usuarioId: me.id },
    orderBy: [{ nome: "asc" }],
    select: { id: true, nome: true, cnpjCpf: true, contato: true },
  });

  const msgErro = e && e !== "NEXT_REDIRECT" ? decodeURIComponent(String(e)) : null;
  const ok = okParam === "1";

  return (
    <main className="max-w-[900px] mr-auto ml-6 p-6 grid gap-5">
      <h1 className="text-2xl font-semibold text-zinc-900">
        Cadastros <span className="text-zinc-400">/</span> Fornecedores
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

      {/* Novo fornecedor */}
      <section className="card relative">
        <div className="card-head mb-2">
          <h2>Novo fornecedor</h2>
        </div>

        <form
          action={criarFornecedor}
          className="grid gap-2 grid-cols-[1fr_220px_1fr_auto] items-center"
        >
          <PendingOverlay />
          <PendingFieldset>
            <input name="nome" placeholder="Razão/Nome" required className="input" />

            <DocInput
              name="cnpjCpf"
              placeholder="CNPJ/CPF"
              required
              className="input"
            />

            <input
              name="contato"
              placeholder="Contato (tel/email/obs)"
              className="input"
            />

            <SubmitButton className="btn btn-primary">Salvar</SubmitButton>
          </PendingFieldset>
        </form>
      </section>

      {/* Lista */}
      <section className="card p-0 overflow-hidden">
        <div className="table-wrap">
          <table className="table w-full">
            <colgroup>
              <col style={{ width: "60px" }} />
              <col />
              <col style={{ width: "230px" }} />
              <col />
              <col style={{ width: "140px" }} />
            </colgroup>

            <thead>
              <tr>
                {["ID", "Nome", "CNPJ/CPF", "Contato", "Ações"].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {fornecedores.map((f) => {
                const rowId = `row-${f.id}`;
                const detailsId = `det-${f.id}`;
                const formId = `edit-${f.id}`;

                return (
                  <tr key={f.id} id={rowId}>
                    <td><span className="cell-view">{f.id}</span></td>

                    <td>
                      <span className="cell-view font-medium text-zinc-900">{f.nome}</span>
                      <input
                        form={formId}
                        name="nome"
                        defaultValue={f.nome}
                        required
                        className="cell-edit input input-sm w-full"
                      />
                    </td>

                    <td>
                      <span className="cell-view">{docMask(f.cnpjCpf)}</span>
                      <DocInput
                        form={formId}
                        name="cnpjCpf"
                        defaultValue={f.cnpjCpf ?? ""}
                        placeholder="CNPJ/CPF"
                        required
                        className="cell-edit input input-sm w-full"
                      />
                    </td>

                    <td>
                      <span className="cell-view">{f.contato || "—"}</span>
                      <input
                        form={formId}
                        name="contato"
                        defaultValue={f.contato ?? ""}
                        placeholder="Contato"
                        className="cell-edit input input-sm w-full"
                      />
                    </td>

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

                      <form action={excluirFornecedor} className="inline ml-2 align-middle">
                        <input type="hidden" name="id" value={f.id} />
                        <ConfirmSubmit
                          className="btn btn-danger btn-sm"
                          message="Excluir este fornecedor?"
                        >
                          Excluir
                        </ConfirmSubmit>
                      </form>

                      {/* form oculto para receber inputs via atributo `form` */}
                      <AutoCloseForm
                        id={formId}
                        action={atualizarFornecedor}
                        rowId={rowId}
                        detailsId={detailsId}
                        className="hidden"
                      >
                        <input type="hidden" name="id" value={f.id} />
                      </AutoCloseForm>

                      <ToggleRowEditing detailsId={detailsId} rowId={rowId} />
                    </td>
                  </tr>
                );
              })}

              {fornecedores.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-zinc-500 py-8">
                    Nenhum fornecedor cadastrado.
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
