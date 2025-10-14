import { prisma } from '@/lib/prisma';
import PrintButton from '@/components/PrintButton';

type Props = { params: Promise<{ id: string }> }; // <- await params

const th: React.CSSProperties = { textAlign: 'left', padding: 8, borderBottom: '1px solid #eee', fontWeight: 600 };
const td: React.CSSProperties = { padding: 8, borderBottom: '1px solid #f2f2f2', verticalAlign: 'top' };
const money = (n: any) => Number(n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const dynamic = 'force-dynamic';

export default async function Page({ params }: Props) {
  const { id } = await params;           // <- await params
  const projetoId = Number(id);

  const est = await prisma.estimativa.findFirst({
    where: { projetoId, aprovada: true },
    include: {
      itens: { include: { produto: true, fornecedor: true, unidade: true }, orderBy: { id: 'asc' } },
    },
  });

  const itens = est?.itens ?? [];
  const total = itens.reduce((acc, i) => acc + Number(i.totalItem || 0), 0);

  return (
    <main style={{ padding: 24, display: 'grid', gap: 12, maxWidth: 900, margin: '0 auto' }}>
      <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <PrintButton label="Imprimir / PDF" auto />
      </div>

      <h1 style={{ fontSize: 20, fontWeight: 700, marginTop: 6 }}>
        Orçamento — Projeto #{projetoId}
      </h1>

      <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
        <thead>
          <tr style={{ background: '#f6f6f6' }}>
            <th style={th}>Produto/Serviço</th>
            <th style={th}>Fornecedor</th>
            <th style={th}>Qtd</th>
            <th style={th}>UM</th>
            <th style={{ ...th, textAlign: 'right' }}>Unit. Materiais</th>
            <th style={{ ...th, textAlign: 'right' }}>Unit. Mão de Obra</th>
            <th style={{ ...th, textAlign: 'right' }}>Total do item</th>
          </tr>
        </thead>
        <tbody>
          {itens.map(i => (
            <tr key={i.id}>
              <td style={td}>{i.produto.nome}</td>
              <td style={td}>{i.fornecedor.nome}</td>
              <td style={td}>{Number(i.quantidade).toLocaleString('pt-BR')}</td>
              <td style={td}>{i.unidade.sigla}</td>
              <td style={{ ...td, textAlign: 'right' }}>{i.valorUnitMat == null ? '—' : money(i.valorUnitMat)}</td>
              <td style={{ ...td, textAlign: 'right' }}>{i.valorUnitMo == null ? '—' : money(i.valorUnitMo)}</td>
              <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>{money(i.totalItem)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: '2px solid #ccc' }}>
            <td colSpan={6} style={{ ...td, textAlign: 'right', fontWeight: 700 }}>Total</td>
            <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{money(total)}</td>
          </tr>
        </tfoot>
      </table>

      <style>{`
        @media print {
          .no-print, .no-print * { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          thead tr { background: #f6f6f6 !important; }
        }
      `}</style>
    </main>
  );
}
