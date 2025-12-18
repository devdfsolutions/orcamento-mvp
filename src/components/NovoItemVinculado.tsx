"use client";

import { useMemo, useState } from "react";
import { adicionarItem } from "@/actions/estimativas";

type ProdutoRow = { id: number; nome: string | null; unidadeMedidaId: number };
type FornecedorRow = { id: number; nome: string | null };
type UnidadeRow = { id: number; sigla: string | null };
type VinculoRow = { produtoId: number; fornecedorId: number };

type FonteMatValue = "" | "P1" | "P2" | "P3" | "MANUAL";
type FonteMoValue = "" | "M1" | "M2" | "M3" | "MANUAL";

type FonteOpt<T extends string> = { v: T; l: string };

export default function NovoItemVinculado(props: {
  estimativaId: number;
  produtos: ProdutoRow[];
  fornecedores: FornecedorRow[];
  unidades: UnidadeRow[];
  vinculos: VinculoRow[];
  fontesMat: ReadonlyArray<FonteOpt<FonteMatValue>>;
  fontesMo: ReadonlyArray<FonteOpt<FonteMoValue>>;
}) {
  const {
    estimativaId,
    produtos,
    fornecedores,
    unidades,
    vinculos,
    fontesMat,
    fontesMo,
  } = props;

  const [produtoText, setProdutoText] = useState("");
  const [fornecedorText, setFornecedorText] = useState("");

  const [produtoId, setProdutoId] = useState<number | null>(null);
  const [fornecedorId, setFornecedorId] = useState<number | null>(null);

  const [quantidade, setQuantidade] = useState<string>("");
  const [ajuste, setAjuste] = useState<string>("");

  const [fonteMat, setFonteMat] = useState<FonteMatValue>("");
  const [fonteMo, setFonteMo] = useState<FonteMoValue>("");

  const produtoByNome = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of produtos) if (p.nome) m.set(p.nome, p.id);
    return m;
  }, [produtos]);

  const fornecedorByNome = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of fornecedores) if (f.nome) m.set(f.nome, f.id);
    return m;
  }, [fornecedores]);

  const allowedFornecedorIds = useMemo(() => {
    if (!produtoId) return new Set(fornecedores.map((f) => f.id));
    const ids = vinculos
      .filter((v) => v.produtoId === produtoId)
      .map((v) => v.fornecedorId);
    return new Set(ids);
  }, [produtoId, vinculos, fornecedores]);

  const allowedProdutoIds = useMemo(() => {
    if (!fornecedorId) return new Set(produtos.map((p) => p.id));
    const ids = vinculos
      .filter((v) => v.fornecedorId === fornecedorId)
      .map((v) => v.produtoId);
    return new Set(ids);
  }, [fornecedorId, vinculos, produtos]);

  const filteredProdutos = useMemo(() => {
    const q = produtoText.trim().toLowerCase();
    return produtos
      .filter((p) => allowedProdutoIds.has(p.id))
      .filter((p) => (q ? (p.nome ?? "").toLowerCase().includes(q) : true))
      .slice(0, 30);
  }, [produtos, produtoText, allowedProdutoIds]);

  const filteredFornecedores = useMemo(() => {
    const q = fornecedorText.trim().toLowerCase();
    return fornecedores
      .filter((f) => allowedFornecedorIds.has(f.id))
      .filter((f) => (q ? (f.nome ?? "").toLowerCase().includes(q) : true))
      .slice(0, 30);
  }, [fornecedores, fornecedorText, allowedFornecedorIds]);

  const produtoSel = useMemo(
    () => produtos.find((p) => p.id === produtoId) ?? null,
    [produtos, produtoId]
  );

  const unidadeSel = useMemo(() => {
    if (!produtoSel) return null;
    return unidades.find((u) => u.id === produtoSel.unidadeMedidaId) ?? null;
  }, [produtoSel, unidades]);

  function onPickProduto(name: string) {
    setProdutoText(name);
    const id = produtoByNome.get(name) ?? null;
    setProdutoId(id);

    // mantém fornecedor se ainda for compatível
    if (id && fornecedorId && !allowedFornecedorIds.has(fornecedorId)) {
      setFornecedorId(null);
      setFornecedorText("");
    }
  }

  function onPickFornecedor(name: string) {
    setFornecedorText(name);
    const id = fornecedorByNome.get(name) ?? null;
    setFornecedorId(id);

    // mantém produto se ainda for compatível
    if (id && produtoId && !allowedProdutoIds.has(produtoId)) {
      setProdutoId(null);
      setProdutoText("");
    }
  }

  const canSubmit =
    !!produtoId &&
    !!fornecedorId &&
    !!produtoSel?.unidadeMedidaId &&
    Number(quantidade) > 0;

  return (
    <form action={adicionarItem} className="grid grid-cols-1 md:grid-cols-12 gap-3">
      <input type="hidden" name="estimativaId" value={estimativaId} />
      <input type="hidden" name="produtoId" value={produtoId ?? ""} />
      <input type="hidden" name="fornecedorId" value={fornecedorId ?? ""} />
      {/* unidade vem do produto (auto) */}
      <input type="hidden" name="unidadeId" value={produtoSel?.unidadeMedidaId ?? ""} />

      {/* LINHA 1 (4 campos) */}
      <div className="md:col-span-5">
        <input
          className="input w-full"
          placeholder="Produto/Serviço (digite)"
          list="produtos-list"
          value={produtoText}
          onChange={(e) => {
            const v = e.target.value;
            setProdutoText(v);
            const id = produtoByNome.get(v) ?? null;
            setProdutoId(id);
          }}
          onBlur={() => onPickProduto(produtoText)}
        />
        <datalist id="produtos-list">
          {filteredProdutos.map((p) => (
            <option key={p.id} value={p.nome ?? ""} />
          ))}
        </datalist>
      </div>

      <div className="md:col-span-4">
        <input
          className="input w-full"
          placeholder="Fornecedor (digite)"
          list="fornecedores-list"
          value={fornecedorText}
          onChange={(e) => {
            const v = e.target.value;
            setFornecedorText(v);
            const id = fornecedorByNome.get(v) ?? null;
            setFornecedorId(id);
          }}
          onBlur={() => onPickFornecedor(fornecedorText)}
        />
        <datalist id="fornecedores-list">
          {filteredFornecedores.map((f) => (
            <option key={f.id} value={f.nome ?? ""} />
          ))}
        </datalist>
      </div>

      <div className="md:col-span-2">
        <input
          className="input w-full"
          value={unidadeSel?.sigla ?? "Unidade (auto)"}
          readOnly
        />
      </div>

      <div className="md:col-span-1">
        <input
          name="quantidade"
          className="input w-full"
          placeholder="Qtd"
          inputMode="decimal"
          value={quantidade}
          onChange={(e) => setQuantidade(e.target.value)}
          required
        />
      </div>

      {/* LINHA 2 (3 campos) */}
      <div className="md:col-span-6">
        <input
          name="ajuste"
          className="input w-full"
          placeholder="Ajuste (ex: 10% ou 100)"
          value={ajuste}
          onChange={(e) => setAjuste(e.target.value)}
        />
      </div>

      <div className="md:col-span-3">
        <select
          name="fontePrecoMat"
          className="input w-full"
          value={fonteMat}
          onChange={(e) => setFonteMat(e.target.value as FonteMatValue)}
        >
          {fontesMat.map((x) => (
            <option key={x.v} value={x.v}>
              {x.l}
            </option>
          ))}
        </select>
      </div>

      <div className="md:col-span-3">
        <select
          name="fontePrecoMo"
          className="input w-full"
          value={fonteMo}
          onChange={(e) => setFonteMo(e.target.value as FonteMoValue)}
        >
          {fontesMo.map((x) => (
            <option key={x.v} value={x.v}>
              {x.l}
            </option>
          ))}
        </select>
      </div>

      {/* botão */}
      <div className="md:col-span-12 flex justify-start">
        <button
          className="btn btn-primary"
          type="submit"
          disabled={!canSubmit}
          title={!canSubmit ? "Selecione Produto, Fornecedor e Qtd > 0" : ""}
        >
          Adicionar item
        </button>
      </div>
    </form>
  );
}
