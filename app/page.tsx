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
  totalAprov: number;
  cliente?: { nome: string; responsavel: string | null } | null;
};

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

  // projetos do usuário (com cliente + responsável)
  const projetos = await prisma.projeto.findMany({
    where: { usuarioId: me.id },
    orderBy: { id: "desc" },
    include: { cliente: { select: { nome: true, responsavel: true } } },
  });

  const total = projetos.length;

  // ✅ Ajuste aqui se você estiver usando "aguardando" (ou outros) como "em estimativa"
  const emEstimativa = projetos.filter(
    (p) => p.status === "rascunho" || p.status === "com_estimativa"
  ).length;

  const aprovadosCount = projetos.filter((p) => p.status === "aprovado").length;
  const execucao = projetos.filter((p) => p.status === "execucao").length;
  const concluidos = projetos.filter((p) => p.status === "concluido").length;

  // estimativas aprovadas dos projetos ainda não concluídos (do meu usuário)
  const aprovadas = await prisma.estimativa.findMany({
    where: {
      usuarioId: me.id,
      aprovada: true,
      projeto: {
        NOT: { status: "concluido" },
        usuarioId: me.id,
      },
    },
    include: {
      itens: { select: { totalItem: true } },
      projeto: { include: { cliente: { select: { nome: true, responsavel: true } } } },
    },
    orderBy: { id: "desc" },
  });

  const gastoProjetado = aprovadas.reduce((acc, e) => {
    const soma = e.itens.reduce((x, i) => x + Number(i.totalItem ?? 0), 0);
    return acc + soma;
  }, 0);

  // últimos 6 com total aprovado
  const ultimos: UltimoProjetoRow[] = await Promise.all(
    projetos.slice(0, 6).map(async (p) => {
      const estAprov = await prisma.estimativa.findFirst({
        where: { projetoId: p.id, usuarioId: me.id, aprovada: true },
        include: { itens: { select: { totalItem: true } } },
      });

      const totalAprov =
        estAprov?.itens.reduce((a, i) => a + Number(i.totalItem ?? 0), 0) ?? 0;

      return {
        id: p.id,
        nome: p.nome,
        status: p.status,
        totalAprov,
        cliente: p.cliente ?? null, // ✅ agora tem {nome, responsavel}
      };
    })
  );

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
