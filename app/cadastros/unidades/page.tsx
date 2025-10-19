// app/cadastros/unidades/page.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

import { prisma } from '@/lib/prisma';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import { criarUnidade, excluirUnidade } from '@/actions/unidades';

export default async function Page({
  searchParams,
}: { searchParams?: { e?: string; ok?: string } }) {
  // auth + perfil
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const me = await prisma.usuario.findUnique({
    where: { supabaseUserId: user.id },
    select: { id: true },
  });
  if (!me) redirect('/login');

  // carrega do meu usuário
  const unidades = await prisma.unidadeMedida.findMany({
    where: { usuarioId: me.id },
    orderBy: { sigla: 'asc' },
  });

  // mensagens
  const rawErr = searchParams?.e ? decodeURIComponent(searchParams.e) : null;
  const msgErro = rawErr && rawErr !== 'NEXT_REDIRECT' ? rawErr : null;
  const ok = searchParams?.ok === '1';

  return (
    <main style={{ padding: 24, maxWidth: 880 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>cadastros/unidades</h1>

      {/* avisos */}
      {msgErro && (
        <div style={{
          marginTop: 12, padding: '10px 12px',
          border: '1px solid #f1d0d0', background: '#ffeaea',
          color: '#7a0000', borderRadius: 8
        }}>
          {msgErro}
        </div>
      )}
      {ok && (
        <div style={{
          marginTop: 12, padding: '10px 12px',
          border: '1px solid #d9f0d0', background: '#f3fff0',
          color: '#235c00', borderRadius: 8
        }}>
          Salvo com sucesso.
        </div>
      )}

      {/* Form criar/editar (upsert pela sigla dentro do usuário) */}
      <form
        action={criarUnidade}
        style={{
          marginTop: 16,
          display: 'grid',
          gap: 8,
          gridTemplateColumns: '160px 1fr auto',
          alignItems: 'center',
        }}
      >
        <input
          name="sigla"
          placeholder="Sigla (ex: m², m, cm, un, h)"
          required
          style={{ padding: '8px 10px', border: '1px solid #ddd', borderRadius: 8 }}
        />
        <input
          name="nome"
          placeholder="Nome (ex: Metro quadrado)"
          required
          style={{ padding: '8px 10px', border: '1px solid #ddd', borderRadius: 8 }}
        />
        <button
          type="submit"
          style={{
            padding: '8px 14px',
            borderRadius: 8,
            background: '#111',
            color: '#fff',
            border: '1px solid #111',
            cursor: 'pointer',
          }}
        >
          Salvar
        </button>
      </form>

      {/* Tabela */}
      <table style={{ width: '100%', marginTop: 18, borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f6f6f6' }}>
            <th style={{ textAlign: 'left', padding: 8, width: 160 }}>Sigla</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Nome</th>
            <th style={{ textAlign: 'left', padding: 8, width: 120 }}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {unidades.map((u) => (
            <tr key={u.id} style={{ borderTop: '1px solid #eee' }}>
              <td style={{ padding: 8 }}>{u.sigla}</td>
              <td style={{ padding: 8 }}>{u.nome}</td>
              <td style={{ padding: 8 }}>
                <form
                  action={async () => {
                    'use server';
                    await excluirUnidade(u.id);
                  }}
                >
                  <button
                    type="submit"
                    style={{
                      padding: '6px 10px',
                      borderRadius: 8,
                      background: '#fff',
                      border: '1px solid #ddd',
                      cursor: 'pointer',
                    }}
                  >
                    Excluir
                  </button>
                </form>
              </td>
            </tr>
          ))}
          {unidades.length === 0 && (
            <tr><td colSpan={3} style={{ padding: 12, color: '#666' }}>Nenhuma unidade cadastrada.</td></tr>
          )}
        </tbody>
      </table>

      <p style={{ marginTop: 10, color: '#666', fontSize: 12 }}>
        Dica: use <b>sigla</b> como chave (é única por usuário). Repetir a sigla atualiza o nome.
      </p>
    </main>
  );
}
