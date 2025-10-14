import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { criarUsuario } from '@/actions/admin';

export default async function Page() {
  // Protege: só ADM
  const supabase = await getSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const me = await prisma.usuario.findUnique({
    where: { supabaseUserId: session.user.id },
    select: { role: true, nome: true, email: true },
  });
  if (me?.role !== 'ADM') redirect('/projetos');

  const usuarios = await prisma.usuario.findMany({
    orderBy: { id: 'desc' },
    select: { id: true, nome: true, email: true, role: true, telefone: true },
  });

  return (
    <main style={{ padding: 24, display: 'grid', gap: 24 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Admin • Usuários</h1>
        <small style={{ color: '#666' }}>Logado: {me?.nome} ({me?.email})</small>
      </header>

      {/* Form de criação */}
      <section style={{ background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Novo usuário</h2>

        <form action={criarUsuario} style={{ display: 'grid', gap: 10, maxWidth: 680 }}>
          <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 220px' }}>
            <input name="nome" placeholder="Nome" required
                   style={{ padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8 }} />
            <input name="cpf" placeholder="CPF (opcional)"
                   style={{ padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8 }} />
          </div>

          <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 220px' }}>
            <input name="email" type="email" placeholder="Email" required
                   style={{ padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8 }} />
            <input name="telefone" placeholder="Telefone (opcional)"
                   style={{ padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8 }} />
          </div>

          <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 160px 160px' }}>
            <input name="cnpj" placeholder="CNPJ (opcional)"
                   style={{ padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8 }} />

            <select name="role" defaultValue="USER"
                    style={{ padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8 }}>
              <option value="USER">USER</option>
              <option value="ADM">ADM</option>
            </select>

            <input name="senha" placeholder="Senha inicial" required
                   style={{ padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8 }} />
          </div>

          <button type="submit"
                  style={{ padding: '10px 12px', borderRadius: 8, background: '#111', color: '#fff', border: 0, cursor: 'pointer', width: 160 }}>
            Criar usuário
          </button>

          <p style={{ color: '#666', fontSize: 12 }}>
            Ao salvar: cria conta no Supabase Auth e grava/atualiza o perfil na tabela <code>Usuario</code>.
          </p>
        </form>
      </section>

      {/* Lista rápida */}
      <section style={{ background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Usuários cadastrados</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', background: '#fafafa' }}>
                <th style={{ padding: 8, borderBottom: '1px solid #eee' }}>ID</th>
                <th style={{ padding: 8, borderBottom: '1px solid #eee' }}>Nome</th>
                <th style={{ padding: 8, borderBottom: '1px solid #eee' }}>Email</th>
                <th style={{ padding: 8, borderBottom: '1px solid #eee' }}>Telefone</th>
                <th style={{ padding: 8, borderBottom: '1px solid #eee' }}>Papel</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map(u => (
                <tr key={u.id}>
                  <td style={{ padding: 8, borderBottom: '1px solid #f0f0f0' }}>{u.id}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f0f0f0' }}>{u.nome}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f0f0f0' }}>{u.email}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f0f0f0' }}>{u.telefone ?? '-'}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f0f0f0' }}>{u.role}</td>
                </tr>
              ))}
              {usuarios.length === 0 && (
                <tr><td colSpan={5} style={{ padding: 8, color: '#666' }}>Sem usuários ainda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
