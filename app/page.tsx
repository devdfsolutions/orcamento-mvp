import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';

const money = (v: any) =>
  Number(v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default async function Home() {
  const projetos = await prisma.projeto.findMany({
    orderBy: { id: 'desc' },
    include: { cliente: true },
  });

  const total = projetos.length;
  const emEstimativa = projetos.filter(p => p.status === 'rascunho' || p.status === 'com_estimativa').length;
  const aprovados    = projetos.filter(p => p.status === 'aprovado').length;
  const execucao     = projetos.filter(p => p.status === 'execucao').length;
  const concluidos   = projetos.filter(p => p.status === 'concluido').length;

  // estimativas aprovadas dos projetos ainda não concluídos
  const aprovadas = await prisma.estimativa.findMany({
    where: { aprovada: true, projeto: { NOT: { status: 'concluido' } } },
    include: { itens: true, projeto: { include: { cliente: true } } },
    orderBy: { id: 'desc' },
  });
  const gastoProjetado = aprovadas.reduce((acc, e) =>
    acc + e.itens.reduce((x, i) => x + Number(i.totalItem || 0), 0), 0);

  // últimos 6 com total aprovado
  const ultimos = await Promise.all(
    projetos.slice(0, 6).map(async (p) => {
      const estAprov = await prisma.estimativa.findFirst({
        where: { projetoId: p.id, aprovada: true },
        include: { itens: true },
      });
      const totalAprov = estAprov?.itens.reduce((a, i) => a + Number(i.totalItem || 0), 0) ?? 0;
      return { ...p, totalAprov };
    })
  );

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Dashboard</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0,1fr))', gap: 12 }}>
        <Card title="Projetos" value={total} />
        <Card title="Em estimativa" value={emEstimativa} />
        <Card title="Aprovados" value={aprovados} />
        <Card title="Execução" value={execucao} />
        <Card title="Concluídos" value={concluidos} />
      </div>

      <div style={card}>
        <div style={{ fontSize: 14, color: '#777', marginBottom: 4 }}>
          Projeção de gastos (aprovados / não concluídos)
        </div>
        <div style={{ fontSize: 26, fontWeight: 700 }}>{money(gastoProjetado)}</div>
      </div>

      <section style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 16, margin: 0 }}>Últimos projetos</h2>
          <a href="/projetos" style={linkBtn}>Ver todos</a>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
          <thead>
            <tr style={{ background: '#f6f6f6' }}>
              <th style={th}>ID</th>
              <th style={th}>Projeto</th>
              <th style={th}>Cliente</th>
              <th style={th}>Status</th>
              <th style={{ ...th, textAlign: 'right' }}>Total aprovado</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {ultimos.map((p) => (
              <tr key={p.id}>
                <td style={td}>{p.id}</td>
                <td style={td}>{p.nome}</td>
                <td style={td}>{p.cliente?.nome ?? '—'}</td>
                <td style={td}>{statusLabel(p.status)}</td>
                <td style={{ ...td, textAlign: 'right' }}>{p.totalAprov ? money(p.totalAprov) : '—'}</td>
                <td style={{ ...td, textAlign: 'right' }}>
                  <a href={`/projetos/${p.id}/itens`} style={linkBtn}>Abrir</a>
                </td>
              </tr>
            ))}
            {ultimos.length === 0 && (
              <tr><td style={td} colSpan={6}>Nenhum projeto ainda.</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

/* UI helpers */
function Card({ title, value }: { title: string; value: number | string }) {
  return (
    <div style={card}>
      <div style={{ fontSize: 12, color: '#777' }}>{title}</div>
      <div style={{ fontSize: 24, fontWeight: 700, marginTop: 2 }}>{value}</div>
    </div>
  );
}

const card: React.CSSProperties = { padding: 12, border: '1px solid #eee', borderRadius: 8, background: '#fff' };
const th: React.CSSProperties = { textAlign: 'left', padding: 10, borderBottom: '1px solid #eee', fontWeight: 600 };
const td: React.CSSProperties = { padding: 10, borderBottom: '1px solid #f2f2f2' };
const linkBtn: React.CSSProperties = { display: 'inline-block', padding: '6px 10px', border: '1px solid #ddd', borderRadius: 8, background: '#f8f8f8', textDecoration: 'none', color: '#111' };

function statusLabel(s: string) {
  switch (s) {
    case 'rascunho': return 'Rascunho';
    case 'com_estimativa': return 'Em estimativa';
    case 'aprovado': return 'Aprovado';
    case 'execucao': return 'Execução';
    case 'concluido': return 'Concluído';
    default: return s;
  }
}
