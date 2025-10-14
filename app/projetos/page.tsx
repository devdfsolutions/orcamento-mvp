// app/projetos/page.tsx
import ConfirmSubmit from '@/components/ConfirmSubmit';
import { prisma } from '@/lib/prisma';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import { criarProjeto } from '@/actions/estimativas';
import { excluirProjeto, excluirProjetosEmLote } from '@/actions/projetos';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const me = await prisma.usuario.findUnique({
    where: { supabaseUserId: user.id },
    select: { id: true },
  });
  if (!me) redirect('/login');

  const clientes = await prisma.clienteUsuario.findMany({
    where: { usuarioId: me.id },
    orderBy: { nome: 'asc' },
    select: { id: true, nome: true },
  });

  const projetos = await prisma.projeto.findMany({
    orderBy: { id: 'desc' },
    include: {
      cliente: { select: { id: true, nome: true } },
      estimativas: { select: { id: true, aprovada: true }, take: 1, orderBy: { id: 'asc' } },
    },
  });

  return (
    <main style={{ padding: 24, display: 'grid', gap: 16, maxWidth: 1000 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Projetos</h1>

      {/* Criar rápido */}
      <section style={card}>
        <h2 style={h2}>Novo projeto</h2>
        <form
          action={criarProjeto}
          style={{ display: 'grid', gap: 8, gridTemplateColumns: '2fr 2fr 140px', alignItems: 'center' }}
        >
          <input name="nome" placeholder="Nome do projeto" required style={input} />

          <select name="clienteId" defaultValue="" style={{ ...input, height: 36 }}>
            <option value="">Cliente (opcional)</option>
            {clientes.map(c => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>

          <button style={btn}>Salvar</button>
        </form>

        <div style={{ marginTop: 8 }}>
          <a href="/projetos/novo" style={linkBtn}>Criar projeto no modo assistido →</a>
        </div>
      </section>

      {/* Lista + Exclusão em lote */}
      <section style={card}>
        <form action={excluirProjetosEmLote}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontWeight: 600 }}>Projetos</div>
            <ConfirmSubmit style={dangerBtn} message="Excluir todos os selecionados? Essa ação não pode ser desfeita.">
              Excluir selecionados
            </ConfirmSubmit>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
            <thead>
              <tr>
                <th style={{ ...th, width: 36 }}></th>
                <th style={th}>ID</th>
                <th style={th}>Projeto</th>
                <th style={th}>Cliente</th>
                <th style={th}>Status</th>
                <th style={{ ...th, textAlign: 'right' }}></th>
              </tr>
            </thead>
            <tbody>
              {projetos.map(p => {
                const v1 = p.estimativas[0];
                const hasAprovada = Boolean(v1?.aprovada);

                return (
                  <tr key={p.id}>
                    {/* checkbox para lote */}
                    <td style={td}>
                      <input type="checkbox" name="ids" value={p.id} />
                    </td>

                    <td style={td}>{p.id}</td>
                    <td style={td}>{p.nome}</td>
                    <td style={td}>{p.cliente?.nome ?? '—'}</td>
                    <td style={td}>{hasAprovada ? 'Estimativa aprovada' : 'Em estimativa'}</td>

                    <td style={{ ...td, whiteSpace: 'nowrap', textAlign: 'right' }}>
                      <a href={`/projetos/${p.id}/itens`} style={linkBtn}>Editar</a>

                      {hasAprovada ? (
                        <a href={`/projetos/${p.id}/estimativas`} style={{ ...linkBtn, marginLeft: 8 }}>Resumo</a>
                      ) : (
                        <span title="Aprove o projeto para ver o resumo" style={{ ...linkBtn, marginLeft: 8, opacity: 0.5, cursor: 'not-allowed' }}>
                          Resumo
                        </span>
                      )}

                      {/* Excluir individual */}
                      <form action={excluirProjeto} style={{ display: 'inline', marginLeft: 8 }}>
                        <input type="hidden" name="id" value={p.id} />
                        <ConfirmSubmit style={dangerBtn} message={`Excluir o projeto #${p.id}? Essa ação não pode ser desfeita.`}>
                          Excluir
                        </ConfirmSubmit>
                      </form>
                    </td>
                  </tr>
                );
              })}
              {projetos.length === 0 && (
                <tr><td style={td} colSpan={6}>Nenhum projeto.</td></tr>
              )}
            </tbody>
          </table>
        </form>
      </section>
    </main>
  );
}

/* estilos */
const card: React.CSSProperties = { padding: 12, border: '1px solid #eee', borderRadius: 8, background: '#fff' };
const h2: React.CSSProperties = { fontSize: 16, margin: '0 0 10px' };
const th: React.CSSProperties = { textAlign: 'left', padding: 10, borderBottom: '1px solid #eee', background: '#fafafa', fontWeight: 600 };
const td: React.CSSProperties = { padding: 10, borderBottom: '1px solid #f2f2f2' };
const input: React.CSSProperties = { height: 36, padding: '0 10px', border: '1px solid #ddd', borderRadius: 8, outline: 'none', minWidth: 220 };
const btn: React.CSSProperties = { height: 36, padding: '0 14px', borderRadius: 8, border: '1px solid #ddd', background: '#111', color: '#fff', cursor: 'pointer' };
const linkBtn: React.CSSProperties = { display: 'inline-block', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, background: '#f8f8f8', textDecoration: 'none', color: '#111' };
const dangerBtn: React.CSSProperties = { height: 30, padding: '0 10px', borderRadius: 8, border: '1px solid #f1d0d0', background: '#ffeaea', color: '#b40000', cursor: 'pointer' };
