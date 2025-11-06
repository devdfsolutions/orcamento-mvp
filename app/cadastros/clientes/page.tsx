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

  // paginação server-side leve
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
        createdAt: true,
        updatedAt: true,
      },
      take: pageSize,
      skip,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <main className="max-w-5xl mx-auto p-6 grid gap-6">
      <h1 className="text-2xl font-semibold">Cadastros / Clientes</h1>

      {/* criar */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-medium mb-3">Novo cliente</h2>

        <form
          action={criarClienteUsuario}
          className="grid gap-2 items-center md:grid-cols-4"
        >
          <input type="hidden" name="usuarioId" value={me.id} />

          <input
            name="nome"
            placeholder="Nome"
            required
            className="h-10 rounded-2xl border border-zinc-300 px-3 md:col-span-1"
          />

          <MaskedInput
            name="cpf"
            placeholder="CPF (opcional)"
            inputMode="numeric"
            maxLength={14}
            mask="cpf"
            className="h-10 rounded-2xl border border-zinc-300 px-3"
          />

          <MaskedInput
            name="cnpj"
            placeholder="CNPJ (opcional)"
            inputMode="numeric"
            maxLength={18}
            mask="cnpj"
            className="h-10 rounded-2xl border border-zinc-300 px-3"
          />

          <input
            name="email"
            placeholder="E-mail (opcional)"
            type="email"
            className="h-10 rounded-2xl border border-zinc-300 px-3 md:col-span-1"
          />

          <input
            name="telefone"
            placeholder="Telefone (opcional)"
            className="h-10 rounded-2xl border border-zinc-300 px-3"
          />

          <input
            name="endereco"
            placeholder="Endereço (opcional)"
            className="h-10 rounded-2xl border border-zinc-300 px-3 md:col-span-2"
          />

          <div className="md:col-span-4 flex justify-end pt-1">
            <button
              className="h-10 px-4 rounded-2xl border border-zinc-900 bg-zinc-900 text-white hover:opacity-90"
            >
              Adicionar Novo
            </button>
          </div>
        </form>
      </section>

      {/* lista */}
      <section className="rounded-2xl overflow-hidden border border-zinc-200 bg-white">
        <table className="w-full border-collapse">
          <thead className="bg-zinc-50">
            <tr>
              {["ID","Nome","CPF","CNPJ","E-mail","Telefone","Endereço",""].map(h => (
                <th key={h} className="text-left p-3 border-b border-zinc-200 font-semibold text-sm">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clientes.map((c) => {
              const detailsId = `det-${c.id}`;
              return (
                <tr key={c.id} className="align-top">
                  <td className="p-3 border-b">{c.id}</td>
                  <td className="p-3 border-b">{c.nome}</td>
                  <td className="p-3 border-b">{formatCPF(c.cpf)}</td>
                  <td className="p-3 border-b">{formatCNPJ(c.cnpj)}</td>
                  <td className="p-3 border-b break-words">{c.email ?? "—"}</td>
                  <td className="p-3 border-b">{c.telefone ?? "—"}</td>
                  <td className="p-3 border-b break-words">{c.endereco ?? "—"}</td>

                  <td className="p-3 border-b text-right whitespace-nowrap">
                    <details id={detailsId} className="inline-block mr-2">
                      <summary className="cursor-pointer inline-block px-3 py-1 rounded-2xl border bg-zinc-100 hover:bg-zinc-200 text-sm">
                        Editar
                      </summary>

                      <div className="pt-2">
                        {/* Só monta quando abrir */}
                        <RenderWhenOpen detailsId={detailsId}>
                          <AutoCloseForm
                            id={`edit-${c.id}`}
                            action={atualizarClienteUsuario}
                            className="grid gap-2 md:grid-cols-4 max-w-3xl"
                          >
                            <input type="hidden" name="id" value={c.id} />

                            <input
                              name="nome"
                              defaultValue={c.nome}
                              required
                              className="h-10 rounded-2xl border border-zinc-300 px-3"
                            />

                            <MaskedInput
                              name="cpf"
                              defaultValue={c.cpf ?? ""}
                              placeholder="CPF"
                              inputMode="numeric"
                              maxLength={14}
                              mask="cpf"
                              className="h-10 rounded-2xl border border-zinc-300 px-3"
                            />

                            <MaskedInput
                              name="cnpj"
                              defaultValue={c.cnpj ?? ""}
                              placeholder="CNPJ"
                              inputMode="numeric"
                              maxLength={18}
                              mask="cnpj"
                              className="h-10 rounded-2xl border border-zinc-300 px-3"
                            />

                            <input
                              name="email"
                              defaultValue={c.email ?? ""}
                              placeholder="E-mail"
                              type="email"
                              className="h-10 rounded-2xl border border-zinc-300 px-3"
                            />

                            <input
                              name="telefone"
                              defaultValue={c.telefone ?? ""}
                              placeholder="Telefone"
                              className="h-10 rounded-2xl border border-zinc-300 px-3"
                            />

                            <input
                              name="endereco"
                              defaultValue={c.endereco ?? ""}
                              placeholder="Endereço"
                              className="h-10 rounded-2xl border border-zinc-300 px-3 md:col-span-3"
                            />
                          </AutoCloseForm>
                        </RenderWhenOpen>
                      </div>
                    </details>

                    <button
                      type="submit"
                      form={`edit-${c.id}`}
                      className="hidden ml-2 h-8 px-3 rounded-2xl border border-zinc-900 bg-zinc-900 text-white text-sm save-btn"
                    >
                      Salvar
                    </button>

                    <form action={excluirClienteUsuario} className="inline ml-2">
                      <input type="hidden" name="id" value={c.id} />
                      <ConfirmSubmit
                        className="h-8 px-3 rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 text-sm"
                        message="Excluir este cliente?"
                      >
                        Excluir
                      </ConfirmSubmit>
                    </form>
                  </td>
                </tr>
              );
            })}

            {clientes.length === 0 && (
              <tr>
                <td className="p-4 text-center text-zinc-600" colSpan={8}>
                  Nenhum cliente cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* CSS mínimo para mostrar o botão Salvar quando details abrir */}
        <style>{`
          td .save-btn { display: none; }
          td details[open] + .save-btn { display: inline-block; }
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
          className={`h-9 px-3 rounded-2xl border text-sm ${
            page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-zinc-50"
          }`}
        >
          Anterior
        </a>
        <a
          href={`?p=${Math.min(totalPages, page + 1)}`}
          aria-disabled={page >= totalPages}
          className={`h-9 px-3 rounded-2xl border text-sm ${
            page >= totalPages ? "pointer-events-none opacity-40" : "hover:bg-zinc-50"
          }`}
        >
          Próxima
        </a>
      </nav>
    </main>
  );
}
