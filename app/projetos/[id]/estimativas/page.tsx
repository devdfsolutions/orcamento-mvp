// app/projetos/[id]/estimativas/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";
import { prisma } from '@/lib/prisma';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';

type Props = { params: { id: string } };

function money(v: any) {
  if (v == null) return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default async function Page({ params }: Props) {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const me = await prisma.usuario.findUnique({
    where: { supabaseUserId: user.id },
    select: { id: true },
  });
  if (!me) redirect('/login');

  const projetoId = Number(params.id);

  // projeto precisa ser meu
  const projeto = await prisma.projeto.findFirst({
    where: { id: projetoId, usuarioId: me.id },
    select: { id: true },
  });
  if (!projeto) redirect('/projetos');

  const estimativa = await prisma.estimativa.findFirst({
    where: { projetoId, usuarioId: me.id, aprovada: true },
    include: {
      itens: {
        include: {
          produto: true,
          unidade: true,
          fornecedor: true,
        },
        orderBy: { id: 'asc' },
      },
    },
  });

  const itens = estimativa?.itens ?? [];
  const total = itens.reduce((acc, i) => acc + Number(i.totalItem || 0), 0);

  return (
    <main style={{ padding: '24px', display: 'grid', gap: 16, maxWidth: 1000 }}>
      <h1 style={{ fontSize: '22px', fontWeight: 700 }}>
        projetos/{projetoId}/estimativas
      </h1>

      {!estimativa ? (
        <p style={{ marginTop: 12, color: '#b00' }}>
          ⚠️ Não há estimativa aprovada para este projeto.
        </p>
      ) : (
        <>
          <p style={{ marginTop: 4, color: '#666' }}>
            Estimativa aprovada: <b>{estimativa?.nome}</b>
          </p>

          <table style={{ marginTop: 16, width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
            <thead>
              <tr style={{ background: '#f6f6f6' }}>
                <th style={th}>Produto/Serviço</th>
                <th style={th}>Qtd</th>
                <th style={th}>UM</th>
                <th style={th}>Fornecedor</th>
                <th style={{ ...th, textAlign: 'right' }}>Total do item</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((i) => (
                <tr key={i.id} style={{ borderTop: '1px solid #eee' }}>
                  <td style={td}>{i.produto.nome}</td>
                  <td style={td}>{Number(i.quantidade).toLocaleString('pt-BR')}</td>
                  <td style={td}>{i.unidade.sigla}</td>
                  <td style={td}>{i.fornecedor.nome}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{money(i.totalItem)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid #ccc' }}>
                <td colSpan={4} style={{ ...td, textAlign: 'right', fontWeight: 700 }}>
                  Total
                </td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{money(total)}</td>
              </tr>
            </tfoot>
          </table>
        </>
      )}
    </main>
  );
}

const th: React.CSSProperties = { textAlign: 'left', padding: 10, borderBottom: '1px solid #eee', fontWeight: 600 };
const td: React.CSSProperties = { padding: 10, borderBottom: '1px solid #f2f2f2' };
