// ===== Config de runtime (uma única vez, no topo) =====
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { prisma } from "@/lib/prisma";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import AutoCloseForm from "@/components/AutoCloseForm";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import {
  criarProduto,
  atualizarProduto,
  excluirProduto,
} from "@/actions/produtos";

/* ===== helpers ===== */
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

export default async function Page() {
  // Auth
  const supabase = getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [unidades, produtos, vinculos] = await Promise.all([
    prisma.unidadeMedida.findMany({
      orderBy: { sigla: "asc" },
      select: { id: true, sigla: true, nome: true },
    }),
    prisma.produtoServico.findMany({
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

  return (
    <main style={{ padding: 24, display: "grid", gap: 16, maxWidth: 1200 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Cadastros / Produtos & Serviços</h1>

      {/* Novo produto/serviço */}
      <section style={card}>
        <h2 style={h2}>Novo produto/serviço</h2>

        <form
          action={criarProduto}
          style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 140px 160px 1fr" }}
        >
          <input name="nome" placeholder="Nome" required style={input} />

          <select name="tipo" defaultValue="AMBOS" required style={{ ...input, height: 36 }}>
            <option value="PRODUTO">Produto</option>
            <option value="SERVICO">Serviço</option>
            <option value="AMBOS">Ambos</option>
          </select>

          <select name="unidadeMedidaId" defaultValue="" required style={{ ...input, height: 36 }}>
            <option value="" disabled>
              Selecione UM
            </option>
            {unidades.map((u) => (
              <option key={u.id} value={u.id}>
                {u.sigla} — {u.nome}
              </option>
            ))}
          </select>

          <input name="categoria" placeholder="Categoria (opcional)" style={input} />

          <div style={{ gridColumn: "1 / span 4", display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" style={btn}>Salvar</button>
          </div>
        </form>
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
            <col style={{ width: 30 }} />
            <col />
            <col style={{ width: 200 }} />
            <col style={{ width: 70 }} />
            <col style={{ width: 140 }} />
            <col style={{ width: 110 }} />
            <col style={{ width: 180 }} />
            <col style={{ width: 110 }} />
            <col style={{ width: 180 }} />
            <col style={{ width: 160 }} />
          </colgroup>

          <thead>
            <tr>
              <th style={th}>ID</th>
              <th style={th}>Nome</th>
              <th style={th}>Tipo</th>
              <th style={th}>UM</th>
              <th style={th}>Categoria</th>
              <th style={{ ...th, textAlign: "right" }}>P1 (menor)</th>
              <th style={th}>Fornecedor (P1)</th>
              <th style={{ ...th, textAlign: "right" }}>P3 (maior)</th>
              <th style={th}>Fornecedor (P3)</th>
              <th style={th}></th>
            </tr>
          </thead>

          <tbody>
            {produtos.map((p) => {
              const vincs = mapPorProduto.get(p.id) ?? [];
              const { min, max } = pickMinMaxByTipo(vincs, (p.tipo as any) ?? "AMBOS");

              return (
                <tr key={p.id}>
                  <td style={td}>{p.id}</td>
                  <td style={{ ...td }} title={p.nome}>
                    {p.nome}
                  </td>
                  <td style={td}>{tipoLabel(p.tipo)}</td>
                  <td style={td}>{p.unidade?.sigla}</td>
                  <td style={{ ...td }} title={p.categoria ?? ""}>
                    {p.categoria ?? "—"}
                  </td>

                  <td style={{ ...td, textAlign: "right" }}>{min ? money(min.preco) : "—"}</td>
                  <td style={{ ...td }} title={min?.fornecedor ?? ""}>
                    {min?.fornecedor ?? "—"}
                  </td>
                  <td style={{ ...td, textAlign: "right" }}>{max ? money(max.preco) : "—"}</td>
                  <td style={{ ...td }} title={max?.fornecedor ?? ""}>
                    {max?.fornecedor ?? "—"}
                  </td>

                  <td style={{ ...td, whiteSpace: "nowrap", textAlign: "right" }}>
                    {/* EDITAR */}
                    <details style={{ display: "inline-block", marginRight: 8 }}>
                      <summary style={linkBtn}>Editar</summary>

                      <div style={{ paddingTop: 8 }}>
                        <AutoCloseForm
                          id={`edit-${p.id}`}
                          action={atualizarProduto}
                          style={{
                            display: "grid",
                            gap: 8,
                            gridTemplateColumns: "1fr 140px 160px 1fr",
                            maxWidth: 900,
                          }}
                        >
                          <input type="hidden" name="id" value={p.id} />
                          <input name="nome" defaultValue={p.nome} required style={input} />
                          <select
                            name="tipo"
                            defaultValue={String(p.tipo ?? "AMBOS")}
                            required
                            style={{ ...input, height: 36 }}
                          >
                            <option value="PRODUTO">Produto</option>
                            <option value="SERVICO">Serviço</option>
                            <option value="AMBOS">Ambos</option>
                          </select>
                          <select
                            name="unidadeMedidaId"
                            defaultValue={String(p.unidadeMedidaId)}
                            required
                            style={{ ...input, height: 36 }}
                          >
                            {unidades.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.sigla}
                              </option>
                            ))}
                          </select>
                          <input
                            name="categoria"
                            defaultValue={p.categoria ?? ""}
                            placeholder="Categoria"
                            style={input}
                          />
                        </AutoCloseForm>
                      </div>
                    </details>

                    {/* SALVAR — aparece quando details está aberto */}
                    <button type="submit" form={`edit-${p.id}`} className="save-btn" style={primaryBtn}>
                      Salvar
                    </button>

                    {/* EXCLUIR */}
                    <form action={excluirProduto} style={{ display: "inline", marginLeft: 8 }}>
                      <input type="hidden" name="id" value={p.id} />
                      <ConfirmSubmit style={dangerBtn} message="Excluir este item?">
                        Excluir
                      </ConfirmSubmit>
                    </form>
                  </td>
                </tr>
              );
            })}
            {produtos.length === 0 && (
              <tr>
                <td style={td} colSpan={10}>
                  Nenhum produto/serviço cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <style>{`
        td .save-btn { display: none; margin-left: 6px; }
        td details[open] + .save-btn { display: inline-block; }
        .ellipsis { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      `}</style>
    </main>
  );
}

/* estilos inline */
const card: React.CSSProperties = { padding: 12, border: "1px solid #eee", borderRadius: 8, background: "#fff" };
const h2: React.CSSProperties = { fontSize: 16, margin: "0 0 10px" };
const th: React.CSSProperties = { textAlign: "left", padding: 10, borderBottom: "1px solid #eee", background: "#fafafa", fontWeight: 600 };
const td: React.CSSProperties = { padding: 10, borderBottom: "1px solid #f2f2f2", verticalAlign: "top" };
const input: React.CSSProperties = { height: 36, padding: "0 10px", border: "1px solid #ddd", borderRadius: 8, outline: "none", width: "100%", boxSizing: "border-box" };
const btn: React.CSSProperties = { height: 36, padding: "0 14px", borderRadius: 8, border: "1px solid #ddd", background: "#111", color: "#fff", cursor: "pointer" };
const primaryBtn: React.CSSProperties = { height: 30, padding: "0 12px", borderRadius: 8, border: "1px solid #111", background: "#111", color: "#fff", cursor: "pointer" };
const dangerBtn: React.CSSProperties = { height: 30, padding: "0 10px", borderRadius: 8, border: "1px solid #f1d0d0", background: "#ffeaea", color: "#b40000", cursor: "pointer" };
const linkBtn: React.CSSProperties = { cursor: "pointer", display: "inline-block", padding: "4px 10px", borderRadius: 8, border: "1px solid #ddd", background: "#f8f8f8" };
