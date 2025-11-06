'use client';
import React, { useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { upsertVinculo, excluirVinculo } from '@/actions/vinculos';
import InlineVinculoRow from '@/components/InlineVinculoRow';

export default function VinculosPage({ fornecedores, produtos, vinculos }: any) {
  const router = useRouter();
  const search = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // limpa NEXT_REDIRECT da URL
  React.useEffect(() => {
    if (search?.toString().includes('NEXT_REDIRECT')) {
      const clean = window.location.pathname;
      window.history.replaceState({}, '', clean);
    }
  }, [search]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await upsertVinculo(formData);
      router.refresh();
    });
  };

  return (
    <main className="max-w-[1200px] mx-auto p-6 grid gap-5">
      <h1 className="text-2xl font-semibold text-zinc-900">
        Cadastros <span className="text-zinc-400">/</span> Vínculos Fornecedor ↔ Produto
      </h1>

      {/* Form */}
      <section className="relative bg-white border border-zinc-200 rounded-lg p-4 shadow-sm">
        {isPending && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center rounded-lg z-10">
            <div className="animate-spin h-6 w-6 border-4 border-zinc-300 border-t-zinc-900 rounded-full"></div>
          </div>
        )}

        <h2 className="font-semibold mb-3">Criar/Atualizar vínculo (upsert)</h2>

        <form onSubmit={handleSubmit} className="grid gap-3">
          {/* Seleções */}
          <div className="grid grid-cols-[1.1fr_1.1fr_0.9fr_1.3fr] gap-2">
            <select name="fornecedorId" required className="input h-9">
              <option value="">Fornecedor</option>
              {fornecedores.map((f: any) => (
                <option key={f.id} value={f.id}>{f.nome}</option>
              ))}
            </select>

            <select name="produtoId" required className="input h-9">
              <option value="">Produto/Serviço</option>
              {produtos.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.nome} {p.unidade?.sigla ? `(${p.unidade.sigla})` : ''}
                </option>
              ))}
            </select>

            <input name="dataUltAtual" placeholder="Data (DD/MM/AAAA)" className="input" />
            <input name="observacao" placeholder="Observação (opcional)" className="input" />
          </div>

          {/* Grupos */}
          <div className="grid grid-cols-2 gap-3">
            <fieldset className="border border-dashed border-zinc-200 rounded-md p-2">
              <legend className="text-xs text-zinc-500 px-1">Preços de materiais</legend>
              <div className="grid grid-cols-3 gap-2">
                <input name="precoMatP1" placeholder="Materiais P1 (R$)" className="input" />
                <input name="precoMatP2" placeholder="Materiais P2 (R$)" className="input" />
                <input name="precoMatP3" placeholder="Materiais P3 (R$)" className="input" />
              </div>
            </fieldset>

            <fieldset className="border border-dashed border-zinc-200 rounded-md p-2">
              <legend className="text-xs text-zinc-500 px-1">Preços de serviços</legend>
              <div className="grid grid-cols-3 gap-2">
                <input name="precoMoM1" placeholder="Mão de Obra M1 (R$)" className="input" />
                <input name="precoMoM2" placeholder="Mão de Obra M2 (R$)" className="input" />
                <input name="precoMoM3" placeholder="Mão de Obra M3 (R$)" className="input" />
              </div>
            </fieldset>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="btn btn-primary disabled:opacity-60"
              disabled={isPending}
            >
              {isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>

        <p className="mt-2 text-xs text-zinc-500">
          Dica: selecione o mesmo fornecedor+produto e preencha novos valores para atualizar (upsert).
        </p>
      </section>

      {/* Tabela */}
      <section className="bg-white border border-zinc-200 rounded-lg overflow-hidden shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-zinc-50 text-zinc-600">
            <tr>
              <th className="text-left p-2">Produto/Serviço</th>
              <th className="text-left p-2">Fornecedor</th>
              <th className="text-center p-2">UM</th>
              <th className="text-right p-2">P1</th>
              <th className="text-right p-2">P2</th>
              <th className="text-right p-2">P3</th>
              <th className="text-right p-2">M1</th>
              <th className="text-right p-2">M2</th>
              <th className="text-right p-2">M3</th>
              <th className="text-left p-2">Atualização</th>
              <th className="text-left p-2">Obs</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {vinculos.map((v: any) => (
              <InlineVinculoRow key={v.id} v={v} onSubmit={upsertVinculo} onDelete={excluirVinculo} />
            ))}
          </tbody>
        </table>
      </section>

      <style jsx>{`
        .input {
          height: 36px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 0 10px;
          font-size: 0.9rem;
        }
        .btn {
          border-radius: 8px;
          height: 36px;
          padding: 0 16px;
          background: #111;
          color: white;
          font-weight: 500;
          border: 1px solid #111;
        }
        .btn:hover {
          background: #000;
        }
        table td {
          border-top: 1px solid #f1f1f1;
          padding: 8px 10px;
        }
      `}</style>
    </main>
  );
}
