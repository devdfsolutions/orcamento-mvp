// app/page.tsx
import type React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSupabaseServer } from "@/lib/supabaseServer";
import UltimosProjetosTabela from "@/components/UltimosProjetosTabela";

export const dynamic = "force-dynamic";

const money = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type UltimoProjetoRow = {
  id: number;
  nome: string;
  status: string;
  totalAprov: number; // (mantive o nome pra não mexer no componente)
  cliente?: { nome: string; responsavel: string | null } | null;
};

function sumItensTotal(
  itens?: Array<{ totalItem: unknown }> | null | undefined
): number {
  if (!itens?.length) return 0;
  return itens.reduce((acc, it) => acc + Number(it.totalItem ?? 0), 0);
}

export default async function Home() {
  // exige login
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

  // ADM -> manda pro admin diretamente
  if (me.role === "ADM") redirect("/admin");

  // ✅ Projetos com cliente + ÚLTIMA estimativa (aprovada ou não) + itens
  const projetos = await prisma.projeto.findMany({
    where: { usuarioId: me.id },
    orderBy: { id: "desc" },
    include: {
      cliente: { select: { nome: true, responsavel: true } },
      estimativas: {
        where: { usuarioId: me.id },
        orderBy: { id: "desc" },
        take: 1,
        include: { itens: { select: { totalItem: true } } },
      },
    },
  });

  const total = projetos.length;

  const emEstimativa = projetos.filter(
    (p) => p.status === "rascunho" || p.status === "com_estimativa"
  ).length;

  const aprovadosCount = projetos.filter((p) => p.status === "aprovado").length;
  const execucao = projetos.filter((p) => p.status === "execucao").length;
  const concluidos = projetos.filter((p) => p.status === "concluido").length;

  // ✅ Projeção: soma projetos "aprovado" + "execucao" e NÃO concluído
  // (se você quiser só "aprovado", troque o Set abaixo por new Set(["aprovado"]))
  const statusContaNaProjecao = new Set(["aprovado", "execucao"]);

  const gastoProjetado = projetos.reduce((acc, p) => {
    if (p.status === "concluido") return acc;
    if (!statusContaNaProjecao.has(String(p.status))) return acc;

    const est = p.estimativas?.[0];
    return acc + sumItensTotal(est?.itens);
  }, 0);

  // ✅ últimos 6 com total da ÚLTIMA estimativa (aprovada ou não)
  const ultimos: UltimoProjetoRow[] = projetos.slice(0, 6).map((p) => {
    const est = p.estimativas?.[0];
    const totalUltima = sumItensTotal(est?.itens);

    return {
      id: p.id,
      nome: p.nome,
      status: p.status,
      totalAprov: totalUltima, // mantém compatível com UltimosProjetosTabela
      cliente: p.cliente ?? null,
    };
  });

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Dashboard</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, minmax(0,1fr))",
          gap: 12,
        }}
      >
        <Card title="Projetos" value={total} />
        <Card title="Em estimativa" value={emEstimativa} />
        <Card title="Aprovados" value={aprovadosCount} />
        <Card title="Execução" value={execucao} />
        <Card title="Concluídos" value={concluidos} />
      </div>

      <div style={card}>
        <div style={{ fontSize: 14, color: "#777", marginBottom: 4 }}>
          Projeção de gastos (aprovados / não concluídos)
        </div>
        <div style={{ fontSize: 26, fontWeight: 700 }}>
          {money(Number(gastoProjetado ?? 0))}
        </div>
      </div>

      <section style={card}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2 style={{ fontSize: 16, margin: 0 }}>Últimos projetos</h2>
          <Link href="/projetos" style={linkBtn}>
            Ver todos
          </Link>
        </div>

        {/* tabela isolada no client */}
        <UltimosProjetosTabela projetos={ultimos} />
      </section>
    </div>
  );
}

/* UI helpers */
function Card({ title, value }: { title: string; value: number | string }) {
  return (
    <div style={card}>
      <div style={{ fontSize: 12, color: "#777" }}>{title}</div>
      <div style={{ fontSize: 24, fontWeight: 700, marginTop: 2 }}>{value}</div>
    </div>
  );
}

const card: React.CSSProperties = {
  padding: 12,
  border: "1px solid #eee",
  borderRadius: 8,
  background: "#fff",
};

const linkBtn: React.CSSProperties = {
  display: "inline-block",
  padding: "6px 10px",
  border: "1px solid #ddd",
  borderRadius: 8,
  background: "#f8f8f8",
  textDecoration: "none",
  color: "#111",
};
