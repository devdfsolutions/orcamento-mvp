"use client";

import { useEffect, useMemo, useState } from "react";

type ProdutoRow = { id: number; nome: string | null };
type FornecedorRow = { id: number; nome: string | null };
type UnidadeRow = { id: number; sigla: string | null };
type VinculoRow = { produtoId: number; fornecedorId: number };

type FonteOpt = { v: string; l: string };

type Props = {
  estimativaId: number;
  produtos: ProdutoRow[];
  fornecedores: FornecedorRow[];
  unidades: UnidadeRow[];
  vinculos: VinculoRow[];
  fontesMat: readonly FonteOpt[];
  fontesMo: readonly FonteOpt[];
  action: (formData: FormData) => Promise<void>;
};

function norm(s: string) {
  return s.trim().toLowerCase();
}

export default function NovoItemVinculado({
  estimativaId,
  produtos,
  fornecedores,
  unidades,
  vinculos,
  fontesMat,
  fontesMo,
  action,
}: Props) {
  const [produtoText, setProdutoText] = useState("");
  const [fornecedorText, setFornecedorText] = useState("");

  const [produtoId, setProdutoId] = useState<number | null>(null);
  const [fornecedorId, setFornecedorId] = useState<number | null>(null);

  const [unidadeId, setUnidadeId] = useState<number | "">("");
  const [quantidade, setQuantidade] = useState("");
  const [ajuste, setAjuste] = useState("");
  const [fonteMat, setFonteMat] = useState<string>("");
  const [fonteMo, setFonteMo] = useState<string>("");

  // index rápido
  const byProduto = useMemo(() => {
    const m = new Map<number, Set<number>>();
    for (const v of vinculos) {
      if (!m.has(v.produtoId)) m.set(v.produtoId, new Set());
      m.get(v.produtoId)!.add(v.fornecedorId);
    }
    return m;
  }, [vinculos]);

  const byFornecedor = useMemo(() => {
    const m = new Map<number, Set<number>>();
    for (const v of vinculos) {
      if (!m.has(v.fornecedorId)) m.set(v.fornecedorId, new Set());
      m.get(v.fornecedorId)!.add(v.produtoId);
    }
    return m;
  }, [vinculos]);

  // filtros (complementares)
  const allowedFornecedorIds = useMemo(() => {
    if (!produtoId) return null; // null = não filtra
    return byProduto.get(produtoId) ?? new Set<number>();
  }, [produtoId, byProduto]);

  const allowedProdutoIds = useMemo(() => {
    if (!fornecedorId) return null;
    return byFornecedor.get(fornecedorId) ?? new Set<number>();
  }, [fornecedorId, byFornecedor]);

  const fornecedoresFiltrados = useMemo(() => {
    if (!allowedFornecedorIds) return fornecedores;
    return fornecedores.filter((f) => allowedFornecedorIds.has(f.id));
  }, [fornecedores, allowedFornecedorIds]);

  const produtosFiltrados = useMemo(() => {
    if (!allowedProdutoIds) return produtos;
    return produtos.filter((p) => allowedProdutoIds.has(p.id));
  }, [produtos, allowedProdutoIds]);

  // quando digita, tenta resolver ID por nome exato
  useEffect(() => {
    const t = norm(produtoText);
    const found = produtos.find((p) => norm(p.nome ?? "") === t);
    setProdutoId(found?.id ?? null);
  }, [produtoText, produtos]);

  useEffect(() => {
    const t = norm(fornecedorText);
    const found = fornecedores.find((f) => norm(f.nome ?? "") === t);
    setFornecedorId(found?.id ?? null);
  }, [fornecedorText, fornecedores]);

  // ✅ regra “complementar”: só limpa o outro se ficar inválido
  useEffect(() => {
    if (!produtoId || !fornecedorId) return;
    const ok = (byProduto.get(produtoId)?.has(fornecedorId) ?? false);
    if (!ok) {
      // se selecionou um combo incompatível, limpa SOMENTE o que foi “forçado” por último?
      // Aqui: mantém o produto e limpa fornecedor, pq fornecedor depende do produto quando produtoId existe.
      setFornecedorId(null);
      setFornecedorText("");
    }
  }, [produtoId, fornecedorId, byProduto]);

  useEffect(() => {
    if (!produtoId || !fornecedorId) return;
    const ok = (byFornecedor.get(fornecedorId)?.has(produtoId) ?? false);
    if (!ok) {
      // se fornecedor foi escolhido e produto ficou inválido, limpa produto
      setProdutoId(null);
      setProdutoText("");
    }
  }, [fornecedorId, produtoId, byFornecedor]);

  return (
    <form action={action} className="grid gap-2 md:grid-cols-12">
      <input type="hidden" name="estimativaId" value={estimativaId} />

      {/* produto - digitável */}
      <div className="md:col-span-4">
        <input
          className="input w-full"
          list="produtos-list"
          placeholder="Produto/Serviço (digite)"
          value={produtoText}
          onChange={(e) => setProdutoText(e.target.value)}
        />
        <datalist id="produtos-list">
          {produtosFiltrados.map((p) => (
            <option key={p.id} value={p.nome ?? "—"} />
          ))}
        </datalist>
        <input type="hidden" name="produtoId" value={produtoId ?? ""} />
      </div>

      {/* fornecedor - digitável */}
      <div className="md:col-span-3">
        <input
          className="input w-full"
          list="fornecedores-list"
          placeholder="Fornecedor (digite)"
          value={fornecedorText}
          onChange={(e) => setFornecedorText(e.target.value)}
        />
        <datalist id="fornecedores-list">
          {fornecedoresFiltrados.map((f) => (
            <option key={f.id} value={f.nome ?? "—"} />
          ))}
        </datalist>
        <input type="hidden" name="fornecedorId" value={fornecedorId ?? ""} />
      </div>

      {/* unidade */}
      <select
        name="unidadeId"
        className="input md:col-span-2"
        required
        value={unidadeId}
        onChange={(e) => setUnidadeId(e.target.value ? Number(e.target.value) : "")}
      >
        <option value="" disabled>
          Unidade
        </option>
        {unidades.map((u) => (
          <option key={u.id} value={u.id}>
            {u.sigla ?? "—"}
          </option>
        ))}
      </select>

      {/* qtd */}
      <input
        name="quantidade"
        className="input md:col-span-1"
        placeholder="Qtd"
        inputMode="decimal"
        required
        value={quantidade}
        onChange={(e) => setQuantidade(e.target.value)}
      />

      {/* ajuste */}
      <input
        name="ajuste"
        className="input md:col-span-2"
        placeholder="Ajuste (ex: 10% ou 100)"
        value={ajuste}
        onChange={(e) => setAjuste(e.target.value)}
      />

      {/* fontes */}
      <select
        name="fontePrecoMat"
        className="input md:col-span-1"
        value={fonteMat}
        onChange={(e) => setFonteMat(e.target.value)}
      >
        {fontesMat.map((x) => (
          <option key={x.v} value={x.v}>
            {x.l}
          </option>
        ))}
      </select>

      <select
        name="fontePrecoMo"
        className="input md:col-span-1"
        value={fonteMo}
        onChange={(e) => setFonteMo(e.target.value)}
      >
        {fontesMo.map((x) => (
          <option key={x.v} value={x.v}>
            {x.l}
          </option>
        ))}
      </select>

      <div className="md:col-span-12 flex justify-start pt-1">
        <button
          className="btn btn-primary"
          type="submit"
          // trava submit se ainda não resolveu IDs
          disabled={!produtoId || !fornecedorId || !unidadeId}
          title={!produtoId || !fornecedorId || !unidadeId ? "Selecione Produto, Fornecedor e Unidade" : ""}
        >
          Adicionar item
        </button>
      </div>
    </form>
  );
}
