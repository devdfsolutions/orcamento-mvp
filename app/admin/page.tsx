// app/admin/page.tsx
import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/authUser';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');

  // Se alguém tentar abrir /admin sem ser ADM, manda para /projetos
  if (user.role !== 'ADM') redirect('/projetos');

  return (
    <main style={{ padding: 24, maxWidth: 1000 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>
        Painel do Admin
      </h1>

      <p style={{ marginBottom: 16 }}>
        Aqui vai o gerenciamento de usuários (criar, editar, bloquear, excluir).
      </p>

      <div style={{ display: 'flex', gap: 8 }}>
        <a href="/projetos" style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, textDecoration: 'none' }}>
          Ir para Projetos (usuário comum)
        </a>
      </div>
    </main>
  );
}
