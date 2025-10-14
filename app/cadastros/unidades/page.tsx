import { prisma } from '@/lib/prisma';
import { criarUnidade, excluirUnidade } from '@/actions/unidades';

export default async function Page() {
  const unidades = await prisma.unidadeMedida.findMany({
    orderBy: { sigla: 'asc' },
  });

  return (
    <main style={{ padding: '24px', maxWidth: 880 }}>
      <h1 style={{ fontSize: '22px', fontWeight: 700 }}>cadastros/unidades</h1>

      {/* Form criar/editar (upsert pela sigla) */}
      <form action={criarUnidade} style={{ marginTop: 16, display: 'grid', gap: 8, gridTemplateColumns: '160px 1fr auto' }}>
        <input
          name="sigla"
          placeholder="Sigla (ex: m², m, cm, un, h)"
          style={{ padding: '8px 10px', border: '1px solid #ddd', borderRadius: 8 }}
          required
        />
        <input
          name="nome"
          placeholder="Nome (ex: Metro quadrado)"
          style={{ padding: '8px 10px', border: '1px solid #ddd', borderRadius: 8 }}
          required
        />
        <button
          type="submit"
          style={{ padding: '8px 14px', borderRadius: 8, background: '#111', color: '#fff', border: '1px solid #111' }}
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
                    style={{ padding: '6px 10px', borderRadius: 8, background: '#fff', border: '1px solid #ddd' }}
                  >
                    Excluir
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p style={{ marginTop: 10, color: '#666', fontSize: 12 }}>
        Dica: use <b>sigla</b> como chave (é única). Repetir a sigla atualiza o nome.
      </p>
    </main>
  );
}
