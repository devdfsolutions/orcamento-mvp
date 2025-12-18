// app/cadastros/vinculos/page.tsx
import React from "react";
import { prisma } from "@/lib/prisma";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";

import { upsertVinculo, excluirVinculo } from "@/actions/vinculos";
import InlineVinculoRow from "@/components/InlineVinculoRow";
import CleanRedirectParam from "@/components/CleanRedirectParam";
import FormPending from "@/components/FormPending";

export const dynamic = "force-dynamic";

/* ===== Tipos Next 15 (searchParams async) ===== */
type SP = Record<string, string | string[] | undefined>;
type Props = { searchParams?: Promise<SP> };

type DbId = number | bigint;
function toNum(id: DbId) {
  return typeof id === "bigint" ? Number(id) : id;
}

/** Shape que o InlineVinculoRow espera (sem null em fornecedor/produto e sem nome null) */
type VinculoRow = {
  id: number;
  usuarioId: number;
  fornecedorId: number;
  produtoId: number;

  precoMatP1: number | null;
  precoMatP2: number | null;
  precoMatP3: number | null;
  precoMoM1: number | null;
  precoMoM2: number | null;
  precoMoM3: number | null;

  dataUltAtual: Date | null;
  observacao: string | null;

  fornecedor: { id: number; nome: string };
  produto: {
    id: number;
    nome: string;
    unidade: { sigla: string | null } | null;
  };
};

export default async function Page({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};

  // Auth
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

  // params
  const e = Array.isArray(sp.e) ? sp.e[0] : sp.e;
  const okParam = Array.isArray(sp.ok) ? sp.ok[0] : sp.ok;

  // limpa URL se vier com NEXT_REDIRECT
  if (e === "NEXT_REDIRECT") redirect("/cadastros/vinculos");

  const rawErr = e && e !== "NEXT_REDIRECT" ? decodeURIComponent(String(e)) : null;
  const ok = okParam === "1";

  // Dados (somente do meu usuário)
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
        UnidadeMedida: { select: { sigla: true } }, // ✅ relation real
      },
    }),

    prisma.fornecedorProduto.findMany({
      where: { usuarioId: me.id },
      orderBy: [{ produtoId: "asc" }, { fornecedorId: "asc" }], // ✅ sem orderBy por relation
      include: {
        Fornecedor: { select: { id: true, nome: true } }, // ✅ relation real
        ProdutoServico: {
          select: {
            id: true,
            nome: true,
            UnidadeMedida: { select: { sigla: true } }, // ✅ relation real
          },
        },
      },
    }),
  ]);

  return (
    <main style={{ padding: 24, display: "grid", gap: 16, maxWidth: 1200, margin: "0 auto" }}>
      {/* limpa ?e=NEXT_REDIRECT da URL no client (extra segurança) */}
      <CleanRedirectParam paramKey="e" badValue="NEXT_REDIRECT" />

      <h1 style={{ fontSize: 22, fontWeight: 700 }}>
        Cadastros / Vínculos Fornecedor ↔ Produto
      </h1>

      {rawErr && (
        <div
          style={{
            padding: "10px 12px",
            border: "1px solid #f1d0d0",
            background: "#ffeaea",
            color: "#7a0000",
            borderRadius: 8,
          }}
        >
          {rawErr}
        </div>
      )}

      {ok && (
        <div
          style={{
            padding: "10px 12px",
            border: "1px solid #c7f2d3",
            background: "#ecfdf3",
            color: "#0f7a2d",
            borderRadius: 8,
          }}
        >
          Salvo com sucesso.
        </div>
      )}

      {/* Novo/Atualizar vínculo (upsert) com loader */}
      <section style={card}>
        <h2 style={h2}>Criar/Atualizar vínculo (upsert)</h2>

        <FormPending action={upsertVinculo} submitText="Salvar" submittingText="Salvando...">
          {/* Linha 1 — Seleções */}
          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1.1fr 1.1fr 0.9fr 1.4fr" }}>
            <select name="fornecedorId" defaultValue="" required style={select}>
              <option value="" disabled>
                Fornecedor
              </option>
              {fornecedores.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>

            <select name="produtoId" defaultValue="" required style={select}>
              <option value="" disabled>
                Produto/Serviço
              </option>
              {produtos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome ?? "—"} {p.UnidadeMedida?.sigla ? `(${p.UnidadeMedida.sigla})` : ""}
                </option>
              ))}
            </select>

            <input name="dataUltAtual" placeholder="Data (DD/MM/AAAA)" style={input} />
            <input name="observacao" placeholder="Observação (opcional)" style={input} />
          </div>

          {/* Linha 2 e 3 — Grupos de preço */}
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
            {/* Materiais */}
            <fieldset style={field}>
              <legend style={legend}>Preços de materiais</legend>
              <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr 1fr" }}>
                <input name="precoMatP1" placeholder="Materiais P1 (R$)" inputMode="decimal" style={input} />
                <input name="precoMatP2" placeholder="Materiais P2 (R$)" inputMode="decimal" style={input} />
                <input name="precoMatP3" placeholder="Materiais P3 (R$)" inputMode="decimal" style={input} />
              </div>
            </fieldset>

            {/* Mão de obra */}
            <fieldset style={field}>
              <legend style={legend}>Preços de serviços</legend>
              <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr 1fr" }}>
                <input name="precoMoM1" placeholder="Mão de Obra M1 (R$)" inputMode="decimal" style={input} />
                <input name="precoMoM2" placeholder="Mão de Obra M2 (R$)" inputMode="decimal" style={input} />
                <input name="precoMoM3" placeholder="Mão de Obra M3 (R$)" inputMode="decimal" style={input} />
              </div>
            </fieldset>
          </div>
        </FormPending>

        <p style={{ marginTop: 6, fontSize: 12, color: "#666" }}>
          Dica: selecione o mesmo fornecedor+produto e preencha novos valores para atualizar (upsert).
        </p>
      </section>

      {/* Lista */}
      <section>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            background: "#fff",
            tableLayout: "fixed",
          }}
        >
          <colgroup>
            <col style={{ width: "26%" }} />
            <col style={{ width: "30%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: 70 }} />
            <col style={{ width: 70 }} />
            <col style={{ width: 70 }} />
            <col style={{ width: 70 }} />
            <col style={{ width: 70 }} />
            <col style={{ width: 70 }} />
            <col style={{ width: "20%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "12%" }} />
          </colgroup>

          <thead>
            <tr>
              <th style={th}>Produto/Serviço</th>
              <th style={th}>Fornecedor</th>
              <th style={{ ...th, textAlign: "center" }}>UM</th>
              <th style={{ ...th, textAlign: "right" }}>P1</th>
              <th style={{ ...th, textAlign: "right" }}>P2</th>
              <th style={{ ...th, textAlign: "right" }}>P3</th>
              <th style={{ ...th, textAlign: "right" }}>M1</th>
              <th style={{ ...th, textAlign: "right" }}>M2</th>
              <th style={{ ...th, textAlign: "right" }}>M3</th>
              <th style={th}>Atualização</th>
              <th style={th}>Obs</th>
              <th style={th}></th>
            </tr>
          </thead>

          <tbody>
            {vinculos.map((v) => {
              const safeV: VinculoRow = {
                id: toNum(v.id as DbId),
                usuarioId: toNum(v.usuarioId as DbId),
                fornecedorId: toNum(v.fornecedorId as DbId),
                produtoId: toNum(v.produtoId as DbId),

                precoMatP1: v.precoMatP1 != null ? Number(v.precoMatP1) : null,
                precoMatP2: v.precoMatP2 != null ? Number(v.precoMatP2) : null,
                precoMatP3: v.precoMatP3 != null ? Number(v.precoMatP3) : null,
                precoMoM1: v.precoMoM1 != null ? Number(v.precoMoM1) : null,
                precoMoM2: v.precoMoM2 != null ? Number(v.precoMoM2) : null,
                precoMoM3: v.precoMoM3 != null ? Number(v.precoMoM3) : null,

                dataUltAtual: v.dataUltAtual ?? null,
                observacao: v.observacao ?? null,

                fornecedor: {
                  id: toNum(v.Fornecedor.id as DbId),
                  nome: v.Fornecedor.nome ?? "—",
                },

                produto: {
                  id: toNum(v.ProdutoServico.id as DbId),
                  nome: v.ProdutoServico.nome ?? "—",
                  unidade: v.ProdutoServico.UnidadeMedida
                    ? { sigla: v.ProdutoServico.UnidadeMedida.sigla ?? null }
                    : null,
                },
              };

              return (
                <InlineVinculoRow
                  key={safeV.id}
                  v={safeV}
                  onSubmit={upsertVinculo}
                  onDelete={excluirVinculo}
                />
              );
            })}

            {vinculos.length === 0 && (
              <tr>
                <td style={td} colSpan={12}>
                  Nenhum vínculo cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}

/* estilos */
const card: React.CSSProperties = {
  padding: 12,
  border: "1px solid #eee",
  borderRadius: 8,
  background: "#fff",
};
const h2: React.CSSProperties = { fontSize: 16, margin: "0 0 10px" };

const legend: React.CSSProperties = {
  fontSize: 12,
  color: "#444",
  padding: "0 6px",
};
const field: React.CSSProperties = {
  border: "1px dashed #e6e6e6",
  borderRadius: 8,
  padding: 10,
  minWidth: 0,
};

const th: React.CSSProperties = {
  textAlign: "left",
  padding: 10,
  borderBottom: "1px solid #eee",
  background: "#fafafa",
  fontWeight: 600,
  whiteSpace: "normal",
};
const td: React.CSSProperties = {
  padding: 10,
  borderBottom: "1px solid #f2f2f2",
  verticalAlign: "top",
  wordBreak: "break-word",
  overflowWrap: "anywhere",
};
const input: React.CSSProperties = {
  height: 36,
  padding: "0 10px",
  border: "1px solid #ddd",
  borderRadius: 8,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};
const select: React.CSSProperties = { ...input, height: 36 };
