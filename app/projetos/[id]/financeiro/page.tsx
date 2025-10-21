// app/projetos/[id]/financeiro/page.tsx
import { prisma } from '@/lib/prisma';
import { salvarResumoFinanceiro } from '@/actions/financeiro';
import FinanceiroTabela from '@/components/FinanceiroTabela';
import { revalidatePath } from 'next/cache';

type Props = { params: { id: string } };

async function getBaseFinanceiro(projetoId: number) {
  // 1) estimativa aprovada + itens
  const estimativa = await prisma.estimativa.findFirst({
    where: { projetoId, aprovada: true },
    include: {
      itens: {
        include: {
          produtoServico: { select: { id: true, nome: true, tipo: true } },
          unidade: { select: { sigla: true } },
        },
      },
    },
  });

  const aPagar =
    estimativa?.itens.reduce((acc, it) => acc + Number(it.totalItem ?? 0), 0) || 0;

  // 2) resumo financeiro (recebemos/observacoes)
  const resumo = await prisma.resumoProjeto.findUnique({
    where: { projetoId },
  });

  // 3) ajustes existentes (para pré-preencher)
  const ajustes = await prisma.financeiroAjuste.findMany({
    where: { projetoId },
    orderBy: { updatedAt: 'desc' },
  });

  const ajustePorItem = new Map<
    number,
    { percentual: number | null; valorFixo: number | null; observacao: string | null }
  >();
  let honorariosPercentual: number | null = null;

  for (const aj of ajustes) {
    if (aj.estimativaItemId) {
      if (!ajustePorItem.has(aj.estimativaItemId)) {
        ajustePorItem.set(aj.estimativaItemId, {
          percentual: aj.percentual ? Number(aj.percentual) : null,
          valorFixo: aj.valorFixo ? Number(aj.valorFixo) : null,
          observacao: aj.observacao ?? null,
        });
      }
    } else if (aj.percentual != null) {
      // interpretamos como honorários no nível do projeto
      if (honorariosPercentual == null) honorariosPercentual = Number(aj.percentual);
    }
  }

  const itensTabela =
    (estimativa?.itens || []).map((it) => {
      const ajuste = it.id ? ajustePorItem.get(it.id) : undefined;
      const precoUnit =
        it.precoUnitario != null ? Number(it.precoUnitario) : 0;
      const subtotal =
        it.totalItem != null
          ? Number(it.totalItem)
          : Number(it.quantidade || 0) * precoUnit;

      const grupoSimilar =
        it.produtoServico?.nome || (it as any).nome || null;

      return {
        id: it.id,
        tipo:
          (it.produtoServico?.tipo as 'PRODUTO' | 'SERVICO') ||
          ((it as any).tipo as 'PRODUTO' | 'SERVICO') ||
          'SERVICO',
        nome: it.produtoServico?.nome || (it as any).nome || `Item #${it.id}`,
        quantidade: Number(it.quantidade || 0),
        unidade: it.unidade?.sigla || null,
        precoUnitario: precoUnit,
        subtotal,
        ajuste: ajuste || null,
        grupoSimilar,
      };
    }) || [];

  return {
    temEstimativaAprovada: !!estimativa,
    aPagar,
    recebemos: Number(resumo?.recebemos || 0),
    observacoes: resumo?.observacoes || '',
    itensTabela,
    honorariosPercentual,
  };
}

export default async function Page({ params }: Props) {
  const projetoId = Number(params.id);
  const usuarioId = 0; // TODO: quando houver auth, substituir pelo ID real do usuário logado

  const {
    temEstimativaAprovada,
    aPagar,
    recebemos,
    observacoes,
    itensTabela,
    honorariosPercentual,
  } = await getBaseFinanceiro(projetoId);

  const lucro = recebemos - aPagar;

  return (
    <main style={{ padding: '24px', maxWidth: 1024 }} className="space-y-8">
      <h1 style={{ fontSize: '22px', fontWeight: 700 }}>
        projetos/{projetoId}/financeiro
      </h1>

      {!temEstimativaAprovada ? (
        <p style={{ color: '#b00', marginTop: 12 }}>
          ⚠️ Este projeto ainda não tem uma estimativa <b>aprovada</b>.
        </p>
      ) : null}

      {/* Resumo (mantido) */}
      <form action={salvarResumoFinanceiro} style={{ marginTop: 8 }}>
        <input type="hidden" name="projetoId" value={projetoId} />

        <div
          style={{
            display: 'grid',
            gap: 12,
            gridTemplateColumns: '1fr 1fr 1fr',
          }}
        >
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
                border: '1px solid '#ddd',
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

        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
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
            Salvar resumo
          </button>
        </div>
      </form>

      {/* Ajustes por item */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Ajustes por item</h2>
        {temEstimativaAprovada ? (
          <FinanceiroTabela
            projetoId={projetoId}
            usuarioId={usuarioId}
            itens={itensTabela}
          />
        ) : (
          <div className="text-sm text-neutral-600">
            Aguardando estimativa aprovada para listar os itens.
          </div>
        )}
      </section>

      {/* Honorários / Consultoria */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Honorários / Consultoria</h2>
        <form
          action={async (formData) => {
            // import dinâmico para evitar erro se o arquivo ainda não existia em builds antigos
            const { aplicarHonorarios } = await import('@/actions/financeiro');
            await aplicarHonorarios(formData);
            revalidatePath(`/projetos/${projetoId}/financeiro`);
          }}
          className="flex items-end gap-8"
        >
          <input type="hidden" name="projetoId" value={projetoId} />
          <input type="hidden" name="usuarioId" value={usuarioId} />
          <div>
            <label className="block text-xs text-neutral-600 mb-1">
              % Honorários sobre o total
            </label>
            <input
              name="percentual"
              defaultValue={honorariosPercentual ?? ''}
              placeholder="ex.: 10"
              inputMode="decimal"
              className="border rounded-md px-3 py-2 w-40"
            />
            <div className="text-xs text-neutral-500 mt-1">
              Use valores positivos (ex.: 10 = +10%).
            </div>
          </div>

          <div>
            <label className="block text-xs text-transparent mb-1">.</label>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg border border-neutral-900 bg-neutral-900 text-white font-semibold"
            >
              Aplicar honorários
            </button>
          </div>
        </form>
      </section>

      {/* PDF */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Apresentação ao cliente</h2>
        <form
          action={async (formData) => {
            const { gerarPdfApresentacao } = await import('@/actions/financeiro');
            await gerarPdfApresentacao(formData);
          }}
          className="flex items-center gap-4"
        >
          <input type="hidden" name="projetoId" value={projetoId} />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg border border-neutral-900 bg-white text-neutral-900 font-semibold"
            title="Gera um PDF com os valores ajustados para enviar ao cliente"
          >
            Gerar PDF (valores ajustados)
          </button>
        </form>
      </section>
    </main>
  );
}
