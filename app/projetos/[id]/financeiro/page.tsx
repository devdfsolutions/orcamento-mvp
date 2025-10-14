// app/projetos/[id]/financeiro/page.tsx
import { prisma } from '@/lib/prisma';
import { salvarResumoFinanceiro } from '@/actions/financeiro';

type Props = { params: { id: string } };

async function getDados(projetoId: number) {
  // 1) estimativa aprovada + itens
  const estimativaAprovada = await prisma.estimativa.findFirst({
    where: { projetoId, aprovada: true },
    include: {
      itens: {
        select: { totalItem: true },
      },
    },
  });

  const aPagar =
    estimativaAprovada?.itens.reduce((acc, i) => acc + Number(i.totalItem || 0), 0) || 0;

  // 2) resumo (recebemos/observacoes)
  const resumo = await prisma.resumoProjeto.findUnique({
    where: { projetoId },
  });

  return {
    aPagar,
    recebemos: Number(resumo?.recebemos || 0),
    observacoes: resumo?.observacoes || '',
    temEstimativaAprovada: !!estimativaAprovada,
  };
}

export default async function Page({ params }: Props) {
  const projetoId = Number(params.id);
  const { aPagar, recebemos, observacoes, temEstimativaAprovada } =
    await getDados(projetoId);

  const lucro = recebemos - aPagar;

  return (
    <main style={{ padding: '24px', maxWidth: 720 }}>
      <h1 style={{ fontSize: '22px', fontWeight: 700 }}>
        projetos/{projetoId}/financeiro
      </h1>

      {!temEstimativaAprovada ? (
        <p style={{ color: '#b00', marginTop: 12 }}>
          ⚠️ Este projeto ainda não tem uma estimativa <b>aprovada</b>.
        </p>
      ) : null}

      <form action={salvarResumoFinanceiro} style={{ marginTop: 24 }}>
        <input type="hidden" name="projetoId" value={projetoId} />

        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr 1fr' }}>
          <div style={{ padding: 16, border: '1px solid #eee', borderRadius: 12 }}>
            <div style={{ fontSize: 12, color: '#666' }}>Recebemos (R$)</div>
            <input
              name="recebemos"
              defaultValue={recebemos.toFixed(2)}
              inputMode="decimal"
              style={{
                marginTop: 6,
                width: '100%',
                padding: '8px 10px',
                border: '1px solid #ddd',
                borderRadius: 8,
                fontWeight: 700,
              }}
            />
          </div>

          <div style={{ padding: 16, border: '1px solid #eee', borderRadius: 12 }}>
            <div style={{ fontSize: 12, color: '#666' }}>A pagar fornecedores (R$)</div>
            <div style={{ marginTop: 10, fontWeight: 700 }}>{aPagar.toFixed(2)}</div>
            <div style={{ marginTop: 6, fontSize: 12, color: '#666' }}>
              Calculado da estimativa aprovada
            </div>
          </div>

          <div style={{ padding: 16, border: '1px solid #eee', borderRadius: 12 }}>
            <div style={{ fontSize: 12, color: '#666' }}>Lucro (R$)</div>
            <div
              style={{
                marginTop: 10,
                fontWeight: 700,
                color: lucro >= 0 ? '#0a0' : '#b00',
              }}
            >
              {lucro.toFixed(2)}
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: '#666' }}>
              Recebemos − A pagar
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>Observações</div>
          <textarea
            name="observacoes"
            defaultValue={observacoes}
            rows={5}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #ddd',
              borderRadius: 8,
            }}
            placeholder="Anotações livres..."
          />
        </div>

        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid #111',
              background: '#111',
              color: '#fff',
              fontWeight: 600,
            }}
          >
            Salvar
          </button>
        </div>
      </form>
    </main>
  );
}
