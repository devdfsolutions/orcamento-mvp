// src/app/projetos/[id]/financeiro/page.tsx
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// (stubs) actions novas — implementar de fato em src/actions/financeiro.ts
import {
  getFinanceiroData,
  salvarObservacaoFinanceiro,
  aplicarHonorariosEmMemoria, // não persiste orçamento, só calcula no resumo
  gerarPdfApresentacaoCliente,
} from "@/actions/financeiro";

// (stubs) componentes novos — implementar de fato em src/components/*
import FinanceiroTabela from "@/components/FinanceiroTabela";
import FinanceiroResumo from "@/components/FinanceiroResumo";

type PageProps = {
  params: { id: string };
  searchParams: Record<string, string | string[] | undefined>;
};

export const dynamic = "force-dynamic";

export default async function FinanceiroProjetoPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) notFound();

  const projetoId = Number(params.id);
  if (Number.isNaN(projetoId)) notFound();

  // Carrega view-model do financeiro (sem alterar o orçamento original)
  // Essa action deve buscar:
  // - projeto, totais (recebido, a pagar, lucro)
  // - observacao atual do financeiro
  // - itens da estimativa aprovada (produtos/serviços) + ajustes existentes (FinanceiroAjuste)
  const vm = await getFinanceiroData(projetoId, Number(session.user.id));

  if (!vm?.projeto) notFound();

  // Helpers para formulários server actions
  async function salvarObservacao(formData: FormData) {
    "use server";
    await salvarObservacaoFinanceiro({
      projetoId,
      observacao: (formData.get("observacao") as string) ?? "",
      usuarioId: Number(session.user.id),
    });
  }

  async function gerarPdf() {
    "use server";
    await gerarPdfApresentacaoCliente({
      projetoId,
      usuarioId: Number(session.user.id),
    });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Financeiro do Projeto</h1>
          <p className="text-sm text-neutral-500">
            Projeto #{vm.projeto.id} — {vm.projeto.nome ?? "Sem nome"}
          </p>
        </div>
        {/* Botão de PDF no topo também */}
        <form action={gerarPdf}>
          <button
            type="submit"
            className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-neutral-50"
          >
            Gerar PDF p/ Cliente
          </button>
        </form>
      </div>

      {/* Cards de totais (preserva o que já existe) */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border p-4">
          <div className="text-xs text-neutral-500">Total Recebido</div>
          <div className="text-xl font-semibold">
            {vm.totais.formatado.totalRecebido}
          </div>
        </div>
        <div className="rounded-xl border p-4">
          <div className="text-xs text-neutral-500">Total a Pagar</div>
          <div className="text-xl font-semibold">
            {vm.totais.formatado.totalAPagar}
          </div>
        </div>
        <div className="rounded-xl border p-4">
          <div className="text-xs text-neutral-500">Lucro Estimado</div>
          <div className="text-xl font-semibold">
            {vm.totais.formatado.lucro}
          </div>
        </div>
      </section>

      {/* Observações (preserva fluxo de salvar existente) */}
      <section className="rounded-xl border p-4 space-y-3">
        <h2 className="text-lg font-medium">Observações</h2>
        <form action={salvarObservacao} className="space-y-3">
          <textarea
            name="observacao"
            defaultValue={vm.observacao ?? ""}
            rows={4}
            className="w-full rounded-lg border p-3 outline-none focus:ring-2"
            placeholder="Observações internas do financeiro deste projeto…"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-neutral-50"
            >
              Salvar
            </button>
          </div>
        </form>
      </section>

      {/* Novidade 1: Tabela de Itens com Ajustes (não altera orçamento original) */}
      <section className="rounded-xl border p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium">Itens da Estimativa Aprovada</h2>
          <div className="text-xs text-neutral-500">
            Ajustes ficam em <code>FinanceiroAjuste</code>
          </div>
        </div>

        <FinanceiroTabela
          projetoId={projetoId}
          usuarioId={Number(session.user.id)}
          itens={vm.itens} // cada item já vem com ajustes aplicáveis (se houver)
        />
      </section>

      {/* Novidade 2: Resumo + Honorários + PDF */}
      <section className="rounded-xl border p-4">
        <FinanceiroResumo
          projetoId={projetoId}
          usuarioId={Number(session.user.id)}
          totaisBase={vm.totais}
          onSimularHonorariosServer={aplicarHonorariosEmMemoria}
          onGerarPdfServer={gerarPdfApresentacaoCliente}
        />
      </section>

      {/* Botão de PDF no final (redundância UX) */}
      <div className="flex justify-end">
        <form action={gerarPdf}>
          <button
            type="submit"
            className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-neutral-50"
          >
            Gerar PDF p/ Cliente
          </button>
        </form>
      </div>
    </div>
  );
}
