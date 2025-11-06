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
import RenderWhenOpen from "@/components/RenderWhenOpen";

export const dynamic = "force-dynamic";

/* ===== helpers ===== */
const digits = (s?: string | null) => (s ? s.replace(/\D+/g, "") : "");

function formatCPF(v?: string | null) {
  const d = digits(v);
  if (d.length !== 11) return v || "—";
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

function formatCNPJ(v?: string | null) {
  const d = digits(v);
  if (d.length !== 14) return v || "—";
  return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}

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
    <main className="max-w-6xl mx-auto p-6 grid gap-6">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold text-zinc-900">
          Cadastros <span className="text-zinc-400">/</span> Clientes
        </h1>
      </header>

      {/* card criar */}
      <section className="card">
        <div className="card-head">
          <h2>Novo cliente</h2>
        </div>

        <form
          action={criarClienteUsuario}
          className="grid gap-3 items-center md:grid-cols-4"
        >
          <input type="hidden" name="usuarioId" value={me.id} />

          <input
            name="nome"
            placeholder="Nome"
            required
            className="input md:col-span-1"
          />

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

          <input
            name="email"
            placeholder="E-mail (opcional)"
            type="email"
            className="input md:col-span-1"
          />

          <input name="telefone" placeholder="Telefone (opcional)" className="input" />

          <input
            name="endereco"
            placeholder="Endereço (opcional)"
            className="input md:col-span-2"
          />

          <div className="md:col-span-4 flex justify-end pt-1">
            <button className="btn btn-primary">Adicionar Novo</button>
          </div>
        </form>
      </section>

      {/* tabela */}
      <section className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table w-full">
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
                return (
                  <tr key={c.id}>
                    <td>{c.id}</td>
                    <td className="font-medium text-zinc-900">{c.nome}</td>
                    <td>{formatCPF(c.cpf)}</td>
                    <td>{formatCNPJ(c.cnpj)}</td>
                    <td className="break-words">{c.email ?? "—"}</td>
                    <td className="whitespace-nowrap">{c.telefone ?? "—"}</td>
                    <td className="break-words">{c.endereco ?? "—"}</td>

                    <td className="text-right whitespace-nowrap">
                      <details id={detailsId} className="inline-block mr-2">
                        <summary className="pill">Editar</summary>
                        <div className="pt-3 pb-1 px-1">
                          <RenderWhenOpen detailsId={detailsId}>
                            <AutoCloseForm
                              id={`edit-${c.id}`}
                              action={atualizarClienteUsuario}
                              className="grid gap-3 md:grid-cols-4 max-w-3xl"
                            >
                              <input type="hidden" name="id" value={c.id} />

                              <input
                                name="nome"
                                defaultValue={c.nome}
                                required
                                className="input"
                              />
                              <MaskedInput
                                name="cpf"
                                defaultValue={c.cpf ?? ""}
                                placeholder="CPF"
                                inputMode="numeric"
                                maxLength={14}
                                mask="cpf"
                                className="input"
                              />
                              <MaskedInput
                                name="cnpj"
                                defaultValue={c.cnpj ?? ""}
                                placeholder="CNPJ"
                                inputMode="numeric"
                                maxLength={18}
                                mask="cnpj"
                                className="input"
                              />
                              <input
                                name="email"
                                defaultValue={c.email ?? ""}
                                placeholder="E-mail"
                                type="email"
                                className="input"
                              />
                              <input
                                name="telefone"
                                defaultValue={c.telefone ?? ""}
                                placeholder="Telefone"
                                className="input"
                              />
                              <input
                                name="endereco"
                                defaultValue={c.endereco ?? ""}
                                placeholder="Endereço"
                                className="input md:col-span-3"
                              />
                            </AutoCloseForm>
                          </RenderWhenOpen>
                        </div>
                      </details>

                      <button
                        type="submit"
                        form={`edit-${c.id}`}
                        className="btn btn-primary btn-sm save-btn"
                      >
                        Salvar
                      </button>

                      <form action={excluirClienteUsuario} className="inline ml-2">
                        <input type="hidden" name="id" value={c.id} />
                        <ConfirmSubmit className="btn btn-danger btn-sm" message="Excluir este cliente?">
                          Excluir
                        </ConfirmSubmit>
                      </form>
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

        {/* CSS: Tailwind helpers + Fallback bonito */}
        <style>{`
          /* ===== tokens ===== */
          :root{
            --bg: #ffffff;
            --border: #e6e7eb;
            --muted: #f7f7fb;
            --text: #0a0a0a;
            --subtext: #6b7280;
            --primary: #0f172a; /* preto azulado */
            --primary-hover: #0b1222;
            --accent: #2563eb; /* azul */
            --danger-bg: #fff1f2;
            --danger-text: #be123c;
            --ring: rgba(37,99,235,.25);
          }

          /* ===== layout cards ===== */
          .card{
            background: var(--bg);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 16px;
            box-shadow: 0 1px 3px rgba(16,24,40,.04);
          }
          .card-head{
            display:flex; align-items:center; justify-content:space-between;
            margin-bottom: 10px;
          }
          .card-head h2{
            margin:0; font-size: 1rem; font-weight: 600; color: var(--text);
          }

          /* ===== inputs ===== */
          .input{
            height: 40px;
            padding: 0 12px;
            border: 1px solid var(--border);
            border-radius: 12px;
            outline: none;
            background: #fff;
          }
          .input:focus{
            border-color: var(--accent);
            box-shadow: 0 0 0 3px var(--ring);
          }

          /* ===== buttons ===== */
          .btn{
            display:inline-flex; align-items:center; justify-content:center;
            border: 1px solid var(--border);
            border-radius: 9999px;
            padding: 0 14px;
            height: 40px;
            font-weight: 500;
            background: #f9fafb;
            color: var(--text);
            cursor: pointer;
            transition: .15s ease;
          }
          .btn:hover{ background:#f3f4f6; }
          .btn-sm{ height: 32px; padding: 0 12px; font-size: .875rem; }
          .btn-primary{
            background: var(--primary);
            border-color: var(--primary);
            color: #fff;
          }
          .btn-primary:hover{ background: var(--primary-hover); }
          .btn-danger{
            background: var(--danger-bg);
            color: var(--danger-text);
            border-color: #fecdd3;
          }
          .btn-danger:hover{ background: #ffe4e6; }

          /* ===== pill (summary) ===== */
          details > summary::-webkit-details-marker{ display:none; }
          details > summary{ list-style:none; }
          .pill{
            display:inline-block; padding: 6px 12px;
            border-radius: 9999px;
            border: 1px solid var(--border);
            background: var(--muted);
            color: var(--text);
            cursor: pointer;
            font-size: .875rem;
          }
          .pill:hover{ background:#eef2ff; border-color:#dfe3f1 }

          /* ===== table ===== */
          .table{ border-collapse: collapse; min-width: 100%; }
          .table thead th{
            background: #f8fafc;
            color: var(--subtext);
            text-align: left;
            font-weight: 600;
            font-size: .875rem;
            padding: 12px 14px;
            border-bottom: 1px solid var(--border);
            position: sticky; top: 0; z-index: 1;
          }
          .table tbody td{
            padding: 12px 14px;
            border-bottom: 1px solid var(--border);
            vertical-align: top;
            color: var(--text);
          }
          .table tbody tr:hover td{ background: #fafafa; }

          /* mostrar botão salvar quando details abre */
          td .save-btn{ display:none; }
          td details[open] + .save-btn{ display:inline-flex; }
        `}</style>
      </section>

      {/* paginação */}
      <nav className="flex items-center justify-end gap-2">
        <span className="text-sm text-zinc-500">
          {total} registro(s) • página {page} de {totalPages}
        </span>
        <a
          href={`?p=${Math.max(1, page - 1)}`}
          aria-disabled={page <= 1}
          className={`btn btn-sm ${page <= 1 ? "opacity-40 pointer-events-none" : ""}`}
        >
          Anterior
        </a>
        <a
          href={`?p=${Math.min(totalPages, page + 1)}`}
          aria-disabled={page >= totalPages}
          className={`btn btn-sm ${page >= totalPages ? "opacity-40 pointer-events-none" : ""}`}
        >
          Próxima
        </a>
      </nav>
    </main>
  );
}
