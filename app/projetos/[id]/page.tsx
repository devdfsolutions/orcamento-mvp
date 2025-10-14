export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";
import { prisma } from '@/lib/prisma';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import { atualizarProjeto, excluirProjeto } from '@/actions/projetos';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string } };

export default async function ProjetoEditPage({ params }: Props) {
  // Auth
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const projetoId = Number(params.id);

  // Carrega projeto + clientes para o select
  const [projeto, clientes] = await Promise.all([
    prisma.projeto.findUnique({
      where: { id: projetoId },
      include: { cliente: true },
    }),
    prisma.clienteUsuario.findMany({
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true },
    }),
  ]);

  if (!projeto) {
    return (
      <main style={{ padding: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Projeto não encontrado</h1>
        <a href="/projetos" style={linkBtn}>Voltar para projetos</a>
      </main>
    );
  }

  const statusOpts = [
    { v: 'rascunho',        t: 'Rascunho' },
    { v: 'em_estimativa',   t: 'Em estimativa' },
    { v: 'com_estimativa',  t: 'Com estimativa' },
    { v: 'aprovado',        t: 'Aprovado' },
    { v: 'execucao',        t: 'Execução' },
    { v: 'concluido',       t: 'Concluído' },
  ];

  return (
    <main style={{ padding: 24, display: 'grid', gap: 16, maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>
          Projeto #{projeto.id} — Editar
        </h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href={`/projetos/${projetoId}/itens`} style={linkBtn}>Orçamento (itens)</a>
          <a href={`/projetos/${projetoId}/estimativas`} style={linkBtn}>Resumo aprovado</a>
          <a href={`/projetos/${projetoId}/financeiro`} style={linkBtn}>Financeiro</a>
        </div>
      </div>

      {/* Form de edição */}
      <section style={card}>
        <h2 style={h2}>Dados do projeto</h2>
        <form action={atualizarProjeto} style={{ display: 'grid', gap: 8, gridTemplateColumns: '2fr 1fr 1fr' }}>
          <input type="hidden" name="id" value={projeto.id} />

          <input
            name="nome"
            defaultValue={projeto.nome}
            placeholder="Nome do projeto"
            required
            style={input}
          />

          <select name="clienteId" defaultValue={String(projeto.clienteId ?? '')} style={input}>
            <option value="">Sem cliente</option>
            {clientes.map(c => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>

          <select name="status" defaultValue={projeto.status} style={input}>
            {statusOpts.map(o => (
              <option key={o.v} value={o.v}>{o.t}</option>
            ))}
          </select>

          <div style={{ gridColumn: '1 / span 3', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button style={primaryBtn}>Salvar alterações</button>
          </div>
        </form>
      </section>

      {/* Ações perigosas */}
      <section style={card}>
        <h2 style={h2}>Ações</h2>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#666' }}>Excluir projeto (remove estimativas e itens)</span>
          <form action={excluirProjeto} onSubmit={(e) => {
            // confirmação simples no client (o onSubmit do server component é respeitado)
            if (!confirm('Tem certeza que deseja excluir este projeto?')) {
              e.preventDefault();
            }
          }}>
            <input type="hidden" name="id" value={projeto.id} />
            <button style={dangerBtn}>Excluir projeto</button>
          </form>
        </div>
      </section>

      <div>
        <a href="/projetos" style={linkBtn}>← Voltar para lista</a>
      </div>
    </main>
  );
}

/* ===== estilos (mesmo padrão do app) ===== */
const card: React.CSSProperties = { padding: 12, border: '1px solid #eee', borderRadius: 8, background: '#fff' };
const h2: React.CSSProperties = { fontSize: 16, margin: '0 0 10px' };
const input: React.CSSProperties = {
  height: 36, padding: '0 10px', border: '1px solid #ddd', borderRadius: 8,
  outline: 'none', width: '100%', boxSizing: 'border-box',
};
const primaryBtn: React.CSSProperties = {
  height: 36, padding: '0 14px', borderRadius: 8, border: '1px solid #111',
  background: '#111', color: '#fff', cursor: 'pointer',
};
const dangerBtn: React.CSSProperties = {
  height: 36, padding: '0 14px', borderRadius: 8, border: '1px solid #f1d0d0',
  background: '#ffeaea', color: '#b40000', cursor: 'pointer',
};
const linkBtn: React.CSSProperties = {
  display: 'inline-block', padding: '8px 12px', border: '1px solid #ddd',
  borderRadius: 8, background: '#f8f8f8', textDecoration: 'none', color: '#111',
};
