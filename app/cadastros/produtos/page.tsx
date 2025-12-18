export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { prisma } from "@/lib/prisma";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";

import ProdutosTabelaClient from "@/components/ProdutosTabelaClient";
import { criarProduto, atualizarProduto, excluirProduto } from "@/actions/produtos";
import { PendingFieldset, SubmitButton, PendingOverlay } from "@/components/FormPending";

/* ===== Tipos Next 15 (searchParams async) ===== */
type SP = Record<string, string | string[] | undefined>;
type Props = { searchParams?: Promise<SP> };

type DbId = number | bigint;
function toNum(id: DbId) {
  return typeof id === "bigint" ? Number(id) : id;
}

type UnidadeClient = { id: number; sigla: string | null; nome: string | null };

type CategoriaClient = { id: number; nome: string };

type ProdutoClient = {
  id: number;
  nome: string | null;
  tipo: "PRODUTO" | "SERVICO" | "AMBOS";
  unidadeMedidaId: number;
  unidadeSigla: string | null;
  categoria: string | null;
};

type VinculoClient = {
  produtoId: number;
  fornecedorNome: string | null;
  precoMatP1: number | null;
  precoMatP2: number | null;
  precoMatP3: number | null;
  precoMoM1: number | null;
  precoMoM2: number | null;
  precoMoM3: number | null;
};

export default async function Page({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};

  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const me = await prisma.usuario.findUnique({
    where: { supabaseUserId: user.id },
    select: { id: true },
  });
  if (!me) redirect("/login");

  const e = Array.isArray(sp.e) ? sp.e[0] : sp.e;
  const okParam = Array.isArray(sp.ok) ? sp.ok[0] : sp.ok;
  if (e === "NEXT_REDIRECT") redirect("/cadastros/produtos");

  const [unidades, categorias, produtos, vinculos] = await Promise.all([
    prisma.unidadeMedida.findMany({
      where: { usuarioId: me.id },
      orderBy: { sigla: "asc" },
      select: { id: true, sigla: true, nome: true },
    }),
    prisma.categoria.findMany({
      where: { usuarioId: me.id },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
    prisma.produtoServico.findMany({
      where: { usuarioId: me.id },
      orderBy: [{ nome: "asc" }],
      select: {
        id: true,
        nome: true,
        tipo: true,
        unidadeMedidaId: true,
        Categoria: { select: { nome: true } },
        UnidadeMedida: { select: { sigla: true } },
      },
    }),
    prisma.fornecedorProduto.findMany({
      where: { usuarioId: me.id },
      include: { Fornecedor: { select: { nome: true } } },
    }),
  ]);

  const msgErro = e && e !== "NEXT_REDIRECT" ? decodeURIComponent(String(e)) : null;
  const ok = okParam === "1";

  const unidadesClient: UnidadeClient[] = unidades.map((u) => ({
    id: toNum(u.id as DbId),
    sigla: u.sigla,
    nome: u.nome,
  }));

  const categoriasClient: CategoriaClient[] = categorias.map((c) => ({
    id: toNum(c.id as DbId),
    nome: c.nome,
  }));

  const produtosClient: ProdutoClient[] = produtos.map((p) => ({
    id: toNum(p.id as DbId),
    nome: p.nome,
    tipo: p.tipo === "PRODUTO" || p.tipo === "SERVICO" || p.tipo === "AMBOS" ? p.tipo : "AMBOS",
    unidadeMedidaId: toNum(p.unidadeMedidaId as DbId),
    unidadeSigla: p.UnidadeMedida?.sigla ?? null,
    categoria: p.Categoria?.nome ?? null,
  }));

  const vinculosClient: VinculoClient[] = vinculos.map((v) => ({
    produtoId: toNum(v.produtoId as DbId),
    fornecedorNome: v.Fornecedor?.nome ?? null,
    precoMatP1: v.precoMatP1 == null ? null : Number(v.precoMatP1),
    precoMatP2: v.precoMatP2 == null ? null : Number(v.precoMatP2),
    precoMatP3: v.precoMatP3 == null ? null : Number(v.precoMatP3),
    precoMoM1: v.precoMoM1 == null ? null : Number(v.precoMoM1),
    precoMoM2: v.precoMoM2 == null ? null : Number(v.precoMoM2),
    precoMoM3: v.precoMoM3 == null ? null : Number(v.precoMoM3),
  }));

  // tenta achar "Geral" pra deixar como default (se existir)
  const geral = categoriasClient.find((c) => c.nome.toLowerCase() === "geral") ?? null;

  return (
    <main className="max-w-[1100px] mr-auto ml-6 p-6 grid gap-5">
      <h1 className="text-2xl font-semibold text-zinc-900">
        Cadastros <span className="text-zinc-400">/</span> Produtos & Serviços
      </h1>

      {msgErro && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-800 px-3 py-2 text-sm">
          {msgErro}
        </div>
      )}
      {ok && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 px-3 py-2 text-sm">
          Salvo com sucesso.
        </div>
      )}

      <section className="card relative">
        <div className="card-head mb-2">
          <h2>Novo produto/serviço</h2>
        </div>

        {/* ✅ agora Categoria é dropdown */}
        <form
          action={criarProduto}
          className="grid gap-2 grid-cols-[1fr_140px_180px_220px_auto] items-center"
        >
          <PendingOverlay />
          <PendingFieldset>
            <input name="nome" placeholder="Nome" required className="input" />

            <select name="tipo" defaultValue="AMBOS" required className="input">
              <option value="PRODUTO">Produto</option>
              <option value="SERVICO">Serviço</option>
              <option value="AMBOS">Ambos</option>
            </select>

            <select name="unidadeMedidaId" defaultValue="" required className="input">
              <option value="" disabled>
                Selecione UM
              </option>
              {unidadesClient.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.sigla} — {u.nome}
                </option>
              ))}
            </select>

            <select
              name="categoriaId"
              defaultValue={geral?.id ?? ""}
              required
              className="input"
              title="Selecione a categoria"
            >
              <option value="" disabled>
                Selecione a categoria
              </option>
              {categoriasClient.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>

            <SubmitButton className="btn btn-primary">Salvar</SubmitButton>
          </PendingFieldset>
        </form>
      </section>

      <ProdutosTabelaClient
        unidades={unidadesClient}
        produtos={produtosClient}
        vinculos={vinculosClient}
        atualizarProduto={atualizarProduto}
        excluirProduto={excluirProduto}
        // ✅ se o seu ProdutosTabelaClient aceitar, eu vou usar isso depois.
        // se ainda não aceitar, não quebra nada — mas pra usar, vou ajustar o componente quando você mandar o arquivo.
        // @ts-expect-error (vamos tipar corretamente quando editar o ProdutosTabelaClient)
        categorias={categoriasClient}
      />

      <style>{`
        :root{
          --bg:#fff; --border:#e6e7eb; --muted:#f7f7fb;
          --text:#0a0a0a; --subtext:#6b7280;
          --primary:#0f172a; --primary-hover:#0b1222;
          --accent:#2563eb; --ring:rgba(37,99,235,.25);
        }
        .card{ background:var(--bg); border:1px solid var(--border); border-radius:12px; padding:12px; box-shadow:0 1px 2px rgba(16,24,40,.04); }
        .card-head h2{ margin:0; font-size:.95rem; font-weight:600; color:var(--text); }
        .input{ height:36px; padding:0 10px; border:1px solid var(--border); border-radius:10px; outline:none; background:#fff; font-size:.95rem; }
        .input:focus{ border-color:var(--accent); box-shadow:0 0 0 3px var(--ring); }
        .btn{ display:inline-flex; align-items:center; justify-content:center; border:1px solid var(--border); border-radius:9999px; padding:0 12px; height:36px; font-weight:500; background:#f9fafb; color:var(--text); cursor:pointer; transition:.15s; font-size:.95rem; }
        .btn:hover{ background:#f3f4f6; }
        .btn-primary{ background:var(--primary); border-color:var(--primary); color:#fff; }
        .btn-primary:hover{ background:var(--primary-hover); }
      `}</style>
    </main>
  );
}
