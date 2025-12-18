"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type UnidadeClient = { id: number; sigla: string | null; nome: string | null };

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

type Props = {
  unidades: UnidadeClient[];
  produtos: ProdutoClient[];
  vinculos: VinculoClient[];
  atualizarProduto: (formData: FormData) => Promise<void>;
  excluirProduto: (formData: FormData) => Promise<void>;
};

type EditRow = {
  nome: string;
  tipo: ProdutoClient["tipo"];
  unidadeMedidaId: number;
  categoria: string;
};

function money(v: number | null) {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function isNextRedirectError(e: unknown) {
  if (!e) return false;

  if (e instanceof Error && e.message === "NEXT_REDIRECT") return true;

  if (typeof e === "object" && e !== null && "digest" in e) {
    const digestValue = (e as { digest?: unknown }).digest;
    const d = typeof digestValue === "string" ? digestValue : "";
    return d.includes("NEXT_REDIRECT");
  }

  return false;
}

type PricePick = { valor: number; fornecedor: string; ref: "P1" | "P2" | "P3" };

function pickMinMaxMat(vs: VinculoClient[]) {
  const picks: PricePick[] = [];

  for (const v of vs) {
    const fornecedor = (v.fornecedorNome ?? "").trim();
    if (!fornecedor) continue;

    const p1 = v.precoMatP1;
    const p2 = v.precoMatP2;
    const p3 = v.precoMatP3;

    if (p1 != null && Number.isFinite(p1)) picks.push({ valor: p1, fornecedor, ref: "P1" });
    if (p2 != null && Number.isFinite(p2)) picks.push({ valor: p2, fornecedor, ref: "P2" });
    if (p3 != null && Number.isFinite(p3)) picks.push({ valor: p3, fornecedor, ref: "P3" });
  }

  if (picks.length === 0) return { min: null as PricePick | null, max: null as PricePick | null };

  let min = picks[0];
  let max = picks[0];

  for (const p of picks) {
    if (p.valor < min.valor) min = p;
    if (p.valor > max.valor) max = p;
  }

  return { min, max };
}

export default function ProdutosTabelaClient({
  unidades,
  produtos,
  vinculos,
  atualizarProduto,
  excluirProduto,
}: Props) {
  const router = useRouter();

  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState<"TODOS" | ProdutoClient["tipo"]>("TODOS");
  const [forn, setForn] = useState<"TODOS" | string>("TODOS");
  const [cat, setCat] = useState<"TODAS" | string>("TODAS");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<EditRow | null>(null);

  const [busy, setBusy] = useState<{
    kind: "save" | "delete" | null;
    id: number | null;
  }>({
    kind: null,
    id: null,
  });
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const vinculosByProduto = useMemo(() => {
    const map = new Map<number, VinculoClient[]>();
    for (const v of vinculos) {
      const arr = map.get(v.produtoId) ?? [];
      arr.push(v);
      map.set(v.produtoId, arr);
    }
    return map;
  }, [vinculos]);

  const categorias = useMemo(() => {
    const set = new Set<string>();
    for (const p of produtos) if (p.categoria) set.add(p.categoria);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [produtos]);

  const fornecedores = useMemo(() => {
    const set = new Set<string>();
    for (const v of vinculos) {
      const nome = (v.fornecedorNome ?? "").trim();
      if (nome) set.add(nome);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [vinculos]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();

    return produtos.filter((p) => {
      if (tipo !== "TODOS" && p.tipo !== tipo) return false;
      if (cat !== "TODAS" && (p.categoria ?? "") !== cat) return false;

      if (forn !== "TODOS") {
        const vs = vinculosByProduto.get(p.id) ?? [];
        const hasFornecedor = vs.some(
          (v) => (v.fornecedorNome ?? "").trim() === forn
        );
        if (!hasFornecedor) return false;
      }

      if (!qq) return true;

      const vs = vinculosByProduto.get(p.id) ?? [];
      const fornecedoresTxt = vs
        .map((v) => (v.fornecedorNome ?? "").toLowerCase())
        .join(" ");

      return (
        String(p.id).includes(qq) ||
        (p.nome ?? "").toLowerCase().includes(qq) ||
        (p.categoria ?? "").toLowerCase().includes(qq) ||
        (p.unidadeSigla ?? "").toLowerCase().includes(qq) ||
        fornecedoresTxt.includes(qq)
      );
    });
  }, [produtos, q, tipo, forn, cat, vinculosByProduto]);

  function startEdit(p: ProdutoClient) {
    setErrMsg(null);
    setEditingId(p.id);
    setDraft({
      nome: p.nome ?? "",
      tipo: p.tipo,
      unidadeMedidaId: p.unidadeMedidaId,
      categoria: p.categoria ?? "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
  }

  async function saveEdit(id: number) {
    if (!draft || busy.kind) return;

    setErrMsg(null);
    setBusy({ kind: "save", id });

    try {
      const fd = new FormData();
      fd.set("id", String(id));
      fd.set("nome", draft.nome);
      fd.set("tipo", draft.tipo);
      fd.set("unidadeMedidaId", String(draft.unidadeMedidaId));
      fd.set("categoria", draft.categoria); // mantém compatível com seu action atual

      await atualizarProduto(fd);

      cancelEdit();
      router.refresh();
    } catch (e) {
      if (isNextRedirectError(e)) {
        cancelEdit();
        router.refresh();
        return;
      }
      setErrMsg(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setBusy({ kind: null, id: null });
    }
  }

  async function remove(id: number) {
    if (busy.kind) return;

    const ok = window.confirm("Excluir este produto/serviço?");
    if (!ok) return;

    setErrMsg(null);
    setBusy({ kind: "delete", id });

    try {
      const fd = new FormData();
      fd.set("id", String(id));
      await excluirProduto(fd);

      if (editingId === id) cancelEdit();
      router.refresh();
    } catch (e) {
      if (isNextRedirectError(e)) {
        if (editingId === id) cancelEdit();
        router.refresh();
        return;
      }
      setErrMsg(e instanceof Error ? e.message : "Erro ao excluir.");
    } finally {
      setBusy({ kind: null, id: null });
    }
  }

  return (
    <section className="card">
      {errMsg && <div className="msg msg-err">{errMsg}</div>}

      {/* ✅ Ordem nova: Buscar → Fornecedor → Categoria → Tipo */}
      <div className="grid gap-2 md:grid-cols-4 items-center mb-3">
        <input
          className="input"
          placeholder="Buscar..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <select
          className="input"
          value={forn}
          onChange={(e) => setForn(e.target.value as "TODOS" | string)}
        >
          <option value="TODOS">Todos fornecedores</option>
          {fornecedores.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>

        <select className="input" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="TODAS">Todas categorias</option>
          {categorias.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          className="input"
          value={tipo}
          onChange={(e) => setTipo(e.target.value as "TODOS" | ProdutoClient["tipo"])}
        >
          <option value="TODOS">Todos</option>
          <option value="PRODUTO">Produto</option>
          <option value="SERVICO">Serviço</option>
          <option value="AMBOS">Ambos</option>
        </select>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 42 }}>ID</th>
              <th style={{ width: 180 }}>Nome</th>
              <th style={{ width: 90 }}>Tipo</th>
              <th style={{ width: 45 }}>UM</th>
              <th style={{ width: 140 }}>Categoria</th>

              {/* ✅ Agora é Min/Max real */}
              <th style={{ width: 130 }}>Menor (Mat)</th>
              <th style={{ width: 170 }}>Fornecedor (menor)</th>
              <th style={{ width: 130 }}>Maior (Mat)</th>
              <th style={{ width: 170 }}>Fornecedor (maior)</th>

              <th style={{ width: 180 }}>Ações</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((p) => {
              const isEditing = editingId === p.id;
              const isSaving = busy.kind === "save" && busy.id === p.id;
              const isDeleting = busy.kind === "delete" && busy.id === p.id;
              const anyBusy = Boolean(busy.kind);

              const vs = vinculosByProduto.get(p.id) ?? [];
              const { min, max } = pickMinMaxMat(vs);

              return (
                <tr key={p.id} className={isEditing ? "editing" : ""}>
                  <td>{p.id}</td>

                  <td>
                    {!isEditing ? (
                      <div className="cell-view">{p.nome ?? "—"}</div>
                    ) : (
                      <div className="cell-edit">
                        <input
                          className="input input-sm"
                          value={draft?.nome ?? ""}
                          onChange={(e) =>
                            setDraft((d) => (d ? { ...d, nome: e.target.value } : d))
                          }
                          disabled={isSaving}
                        />
                      </div>
                    )}
                  </td>

                  <td>
                    {!isEditing ? (
                      <div className="cell-view">{p.tipo}</div>
                    ) : (
                      <div className="cell-edit">
                        <select
                          className="input input-sm"
                          value={draft?.tipo ?? "AMBOS"}
                          onChange={(e) =>
                            setDraft((d) =>
                              d
                                ? { ...d, tipo: e.target.value as ProdutoClient["tipo"] }
                                : d
                            )
                          }
                          disabled={isSaving}
                        >
                          <option value="PRODUTO">Produto</option>
                          <option value="SERVICO">Serviço</option>
                          <option value="AMBOS">Ambos</option>
                        </select>
                      </div>
                    )}
                  </td>

                  <td>
                    {!isEditing ? (
                      <div className="cell-view">{p.unidadeSigla ?? "—"}</div>
                    ) : (
                      <div className="cell-edit">
                        <select
                          className="input input-sm"
                          value={String(draft?.unidadeMedidaId ?? 0)}
                          onChange={(e) =>
                            setDraft((d) =>
                              d ? { ...d, unidadeMedidaId: Number(e.target.value) } : d
                            )
                          }
                          disabled={isSaving}
                        >
                          {unidades.map((u) => (
                            <option key={u.id} value={u.id}>
                              {(u.sigla ?? "").trim() || "—"}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </td>

                  <td>
                    {!isEditing ? (
                      <div className="cell-view">{p.categoria ?? "—"}</div>
                    ) : (
                      <div className="cell-edit">
                        <input
                          className="input input-sm"
                          value={draft?.categoria ?? ""}
                          onChange={(e) =>
                            setDraft((d) => (d ? { ...d, categoria: e.target.value } : d))
                          }
                          disabled={isSaving}
                        />
                      </div>
                    )}
                  </td>

                  <td className="whitespace-nowrap">
                    {min ? `${money(min.valor)} (${min.ref})` : "—"}
                  </td>
                  <td>{min?.fornecedor ?? "—"}</td>

                  <td className="whitespace-nowrap">
                    {max ? `${money(max.valor)} (${max.ref})` : "—"}
                  </td>
                  <td>{max?.fornecedor ?? "—"}</td>

                  <td className="actions">
                    {!isEditing ? (
                      <>
                        <button
                          className="btn btn-sm"
                          type="button"
                          onClick={() => startEdit(p)}
                          disabled={anyBusy}
                        >
                          Editar
                        </button>

                        <button
                          className="btn btn-sm btn-danger"
                          type="button"
                          onClick={() => remove(p.id)}
                          disabled={anyBusy}
                        >
                          {isDeleting ? "Excluindo..." : "Excluir"}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="btn btn-sm btn-primary"
                          type="button"
                          onClick={() => saveEdit(p.id)}
                          disabled={anyBusy}
                        >
                          {isSaving ? "Salvando..." : "Salvar"}
                        </button>

                        <button
                          className="btn btn-sm"
                          type="button"
                          onClick={cancelEdit}
                          disabled={isSaving}
                        >
                          Cancelar
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} style={{ textAlign: "center", padding: 20, color: "#6b7280" }}>
                  Nenhum item encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .card {
          background: #fff;
          border: 1px solid #e6e7eb;
          border-radius: 12px;
          padding: 12px;
          box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
        }
        .msg {
          border-radius: 12px;
          padding: 10px 12px;
          font-size: 0.9rem;
          margin-bottom: 10px;
        }
        .msg-err {
          border: 1px solid #fecdd3;
          background: #fff1f2;
          color: #9f1239;
        }
        .input {
          height: 36px;
          padding: 0 10px;
          border: 1px solid #e6e7eb;
          border-radius: 10px;
          outline: none;
          background: #fff;
          font-size: 0.95rem;
        }
        .input-sm {
          height: 30px;
          padding: 0 8px;
          font-size: 0.9rem;
        }
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #e6e7eb;
          border-radius: 9999px;
          padding: 0 12px;
          height: 36px;
          font-weight: 500;
          background: #f9fafb;
          cursor: pointer;
          transition: 0.15s;
          font-size: 0.95rem;
        }
        .btn:hover {
          background: #f3f4f6;
        }
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .btn-sm {
          height: 30px;
          padding: 0 10px;
          font-size: 0.85rem;
        }
        .btn-primary {
          background: #0f172a;
          border-color: #0f172a;
          color: #fff;
        }
        .btn-danger {
          background: #fff1f2;
          color: #be123c;
          border-color: #fecdd3;
        }
        .table-wrap {
          overflow-x: auto;
        }
        .table {
          border-collapse: collapse;
          table-layout: fixed;
          width: 100%;
          font-size: 0.95rem;
        }
        .table thead th {
          background: #f8fafc;
          color: #6b7280;
          text-align: left;
          font-weight: 600;
          font-size: 0.85rem;
          padding: 10px 12px;
          border-bottom: 1px solid #e6e7eb;
          white-space: nowrap;
        }
        .table tbody td {
          padding: 10px 12px;
          border-bottom: 1px solid #e6e7eb;
          vertical-align: middle;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
          white-space: nowrap;
        }
        .cell-edit {
          display: none;
        }
        tr.editing .cell-view {
          display: none;
        }
        tr.editing .cell-edit {
          display: block;
        }
      `}</style>
    </section>
  );
}
