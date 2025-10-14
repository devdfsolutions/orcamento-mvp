// ===== Config de runtime (uma única vez, no topo) =====
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { prisma } from "@/lib/prisma";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import InlineVinculoRow from "@/components/InlineVinculoRow";
import { upsertVinculo, excluirVinculo } from "@/actions/vinculos";

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
  // Materiais
  precoMatP1: number | null;
  precoMatP2: number | null;
  precoMatP3: number | null;
  // Mão de obra
  precoMoM1: number | null;
  precoMoM2: number | null;
  precoMoM3: number | null;
};

/** Pega min/max de acordo com o tipo do produto:
 * - PRODUTO / AMBOS -> usa materiais (P1..P3)
 * - SERVICO         -> usa mão de obra (M1..M3)
 */
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

/* ===== page ===== */
export default async function Page() {
  // Auth
  const supabase = getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [unidades, produtos] = await Promise.all([
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
  ]);

  // vínculos (Fornecedor ↔ Produto)
  const vinculos = await prisma.fornecedorProduto.findMany({
    include: { fornecedor: { select: { nome: true } } },
  });

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

      {/* criar (sem preços) */}
      <section style={card}>
        <h2 style={h2}>Novo produto/serviço</h2>

        <form
          action={"/api/ignore"} // apenas placeholder; sua criação de produto está em outra page
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
            <button type="submit" style={btn} disabled>
              Salvar (exemplo)
            </button>
          </div>
        </form>
      </section>

      {/* lista de vínculos com edição inline */}
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
            <col style={{ width: "20%" }} />
            <col style={{ width: "25%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: 70 }} />
            <col style={{ width: 70 }} />
            <col style={{ width: 70 }} />
            <col style={{ width: 70 }} />
            <col style={{ width: 70 }} />
            <col style={{ width: 70 }} />
            <col style={{ width: "20%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "12%" }} />
          </colgroup>
          <thead>
            <tr>
              <th style={th}>Fornecedor</th>
              <th style={th}>Produto/Serviço</th>
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
              const safeV = {
                ...v,
                precoMatP1: v.precoMatP1 ? Number(v.precoMatP1) : null,
                precoMatP2: v.precoMatP2 ? Number(v.precoMatP2) : null,
                precoMatP3: v.precoMatP3 ? Number(v.precoMatP3) : null,
                precoMoM1: v.precoMoM1 ? Number(v.precoMoM1) : null,
                precoMoM2: v.precoMoM2 ? Number(v.precoMoM2) : null,
                precoMoM3: v.precoMoM3 ? Number(v.precoMoM3) : null,
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

/* estilos inline */
const card: React.CSSProperties = {
  padding: 12,
  border: "1px solid #eee",
  borderRadius: 8,
  background: "#fff",
};
const h2: React.CSSProperties = { fontSize: 16, margin: "0 0 10px" };
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
const btn: React.CSSProperties = {
  height: 36,
  padding: "0 14px",
  borderRadius: 8,
  border: "1px solid #ddd",
  background: "#111",
  color: "#fff",
  cursor: "pointer",
};
