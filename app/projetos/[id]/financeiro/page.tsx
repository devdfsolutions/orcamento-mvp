// app/projetos/[id]/financeiro/page.tsx
import { prisma } from '@/lib/prisma';
import { salvarResumoFinanceiro, gerarPdfApresentacao } from '@/actions/financeiro';
import FinanceiroTabela from '@/components/FinanceiroTabela';

type Props = { params: { id: string } };

function toNum(v: any, fallback = 0): number {
  if (v == null) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

async function getBaseFinanceiro(projetoId: number) {
  // 1) Pega estimativas deste projeto (aprovada primeiro; depois mais recente)
  const estimativas = await prisma.estimativa.findMany({
    where: { projetoId },
    orderBy: [{ aprovada: 'desc' }, { criadaEm: 'desc' }],
    select: { id: true, aprovada: true },
  });

  const escolhida = estimativas[0] || null;
  const estimativaId = escolhida?.id ?? null;
  const veioAprovada = !!escolhida?.aprovada;

  // 2) Itens da estimativa escolhida (se houver)
  let itens:
    | Array<{
        id: number;
        quantidade: any;
        valorUnitMat: any;
        valorUnitMo: any;
        totalItem: any;
        produto?: { nome: string | null; tipo: 'PRODUTO' | 'SERVICO' | 'AMBOS' | null } | null;
        unidade?: { sigla: string | null } | null;
      }>
    | [] = [];

  if (estimativaId) {
    try {
      itens = await prisma.estimativaItem.findMany({
        where: { estimativaId },
        orderBy: { id: 'asc' },
        select: {
          id: true,
          quantidade: true,
          valorUnitMat: true,
          valorUnitMo: true,
          totalItem: true,
          produto: { select: { nome: true, tipo: true } },
          unidade: { select: { sigla: true } },
        },
      });
    } catch (e) {
      console.error('[financeiro] erro buscando itens da estimativa', {
        projetoId,
        estimativaId,
        e,
      });
      itens = [];
    }
  }

  // 3) Resumo financeiro (recebemos/observações)
  let recebemosNum = 0;
  let observacoes = '';
  try {
    const resumo = await prisma.resumoProjeto.findUnique({ where: { projetoId } });
    recebemosNum = toNum(resumo?.recebemos, 0);
    observacoes = resumo?.observacoes || '';
  } catch (e) {
    console.error('[financeiro] erro buscando resumo', { projetoId, e });
  }

  // 4) Ajustes já gravados (para pré-preencher %/R$/obs por item)
  const ajustePorItem = new Map<
    number,
    { percentual: number | null; valorFixo: number | null; observacao: string | null }
  >();

  try {
    const ajustes = await prisma.financeiroAjuste.findMany({
      where: { projetoId },
      orderBy: { updatedAt: 'desc' },
    });

    for (const aj of ajustes) {
      if (aj.estimativaItemId) {
        if (!ajustePorItem.has(aj.estimativaItemId)) {
          ajustePorItem.set(aj.estimativaItemId, {
            percentual: aj.percentual != null ? toNum(aj.percentual, null as any) : null,
            valorFixo: aj.valorFixo != null ? toNum(aj.valorFixo, null as any) : null,
            observacao: aj.observacao ?? null,
          });
        }
      }
    }
  } catch (e) {
    console.error('[financeiro] erro buscando ajustes', { projetoId, e });
  }

  // 5) Normalização dos itens para a tabela
  const itensTabela = (itens || []).map((it) => {
    const q = toNum(it.quantidade, 0);
    const unitMat = toNum(it.valorUnitMat, 0);
    const unitMo = toNum(it.valorUnitMo, 0);
    const subtotal = toNum(it.totalItem, 0);

    const precoUnitarioBase = unitMat + unitMo;
    const precoUnitario = precoUnitarioBase > 0 ? precoUnitarioBase : q > 0 ? subtotal / q : 0;

    const ajuste = it.id ? ajustePorItem.get(it.id) : undefined;

    return {
      id: it.id,
      tipo: (it.produto?.tipo as 'PRODUTO' | 'SERVICO' | 'AMBOS') === 'PRODUTO' ? 'PRODUTO' : 'SERVICO',
      nome: it.produto?.nome || `Item #${it.id}`,
      quantidade: q,
      unidade: it.unidade?.sigla ?? null,
      precoUnitario,
      subtotal,
      ajuste: ajuste || null,
      grupoSimilar: it.produto?.nome || null,
    };
  });

  const aPagar = itensTabela.reduce((acc, it) => acc + toNum(it.subtotal, 0), 0);

  return {
    temEstimativaParaExibir: !!estimativaId,
    veioAprovada,
    aPagar,
    recebemos: recebemosNum,
    observacoes,
    itensTabela,
  };
}

export default async function Page({ params }: Props) {
  const projetoId = Number(params.id);
  const usuarioId = 0; // quando tiver auth, preencher com o usuário logado

  const {
    temEstimativaParaExibir,
    veioAprovada,
    aPagar,
    recebemos,
    observacoes,
    itensTabela,
  } = await getBaseFinanceiro(projetoId);

  const lucro = recebemos - aPagar;

  return (
    <main style={{ padding: '24px', maxWidth: 1024 }} className="space-y-8">
      <h1 style={{ fontSize: '22px', fontWeight: 700 }}>
        projetos/{projetoId}/financeiro
      </h1>

      {!temEstimativaParaExibir ? (
        <p style={{ color: '#b00', marginTop: 12 }}>
          ⚠️ Nenhuma estimativa encontrada para este projeto ainda.
        </p>
      ) : !veioAprovada ? (
        <p style={{ color: '#b8860b', marginTop: 12 }}>
          ⚠️ <b>Sem estimativa aprovada.</b> Exibindo a <b>mais recente</b> do projeto.
        </p>
      ) : null}

      {/* RESUMO */}
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
              Calculado da estimativa atual
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

      {/* TABELA DE ITENS (com ajustes, similares e honorários na toolbar) */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Ajustes por item</h2>
        {temEstimativaParaExibir ? (
          <FinanceiroTabela
            projetoId={projetoId}
            usuarioId={usuarioId}
            itens={itensTabela}
            recebemos={recebemos}
          />
        ) : (
          <div className="text-sm text-neutral-600">Nenhuma estimativa para exibir.</div>
        )}
      </section>

      {/* PDF */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Apresentação ao cliente</h2>
        <form action={gerarPdfApresentacao} className="flex items-center gap-4">
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
