"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import ConfirmDelete from "@/components/ConfirmDelete";

/** Props compatíveis com prisma.fornecedorProduto + includes usados na page */
type Vinculo = {
  id: number;
  fornecedorId: number;
  produtoId: number;
  fornecedor: { id: number; nome: string };
  produto: { id: number; nome: string; unidade?: { sigla?: string | null } | null };
  // preços
  precoMatP1: number | null;
  precoMatP2: number | null;
  precoMatP3: number | null;
  precoMoM1: number | null;
  precoMoM2: number | null;
  precoMoM3: number | null;
  // datas/obs
  dataUltAtual: string | Date | null;
  observacao: string | null;
};

type Props = {
  v: Vinculo;
  onSubmit: (formData: FormData) => Promise<void>; // server action upsertVinculo
  onDelete: (formData: FormData) => Promise<void>; // server action excluirVinculo
};

/* ===== helpers ===== */
const moneyShort = (v: number | string | null | undefined) => {
  if (v == null) return "—";
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtDateBR = (d: Date | string | null | undefined) => {
  if (!d) return "";
  const x = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(x.getTime())) return "";
  const dd = String(x.getDate()).padStart(2, "0");
  const mm = String(x.getMonth() + 1).padStart(2, "0");
  const yyyy = String(x.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
};

const parseEditable = (v: number | null) => (v == null ? "" : String(v));

/* ===== estilos locais ===== */
const cell: React.CSSProperties = {
  padding: 10,
  borderBottom: "1px solid #f2f2f2",
  verticalAlign: "top",
  wordBreak: "break-word",
  overflowWrap: "anywhere",
};
const numCell: React.CSSProperties = {
  ...cell,
  textAlign: "right",
  whiteSpace: "nowrap",
  fontVariantNumeric: "tabular-nums",
};
const inputCell: React.CSSProperties = {
  height: 30,
  padding: "0 8px",
  border: "1px solid #ddd",
  borderRadius: 6,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
  textAlign: "right",
};
const inputText: React.CSSProperties = {
  height: 30,
  padding: "0 8px",
  border: "1px solid #ddd",
  borderRadius: 6,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};
const actionBtn: React.CSSProperties = {
  height: 30,
  padding: "0 10px",
  borderRadius: 8,
  border: "1px solid #ddd",
  background: "#f8f8f8",
  color: "#111",
  cursor: "pointer",
};
const primaryBtn: React.CSSProperties = {
  ...actionBtn,
  border: "1px solid #111",
  background: "#111",
  color: "#fff",
};
const dangerBtn: React.CSSProperties = {
  ...actionBtn,
  border: "1px solid #f1d0d0",
  background: "#ffeaea",
  color: "#b40000",
};

export default function InlineVinculoRow({ v, onSubmit, onDelete }: Props) {
  const [edit, setEdit] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  // ✅ FECHA o editor quando a page voltar com ?ok=1
  React.useEffect(() => {
    const ok = searchParams.get("ok");
    if (ok === "1") {
      setEdit(false);

      // limpa ok=1 da URL sem recarregar
      const sp = new URLSearchParams(searchParams.toString());
      sp.delete("ok");
      const qs = sp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    }
  }, [searchParams, pathname, router]);

  // estados dos campos editáveis
  const [precoMatP1, setPrecoMatP1] = React.useState<string>(parseEditable(v.precoMatP1));
  const [precoMatP2, setPrecoMatP2] = React.useState<string>(parseEditable(v.precoMatP2));
  const [precoMatP3, setPrecoMatP3] = React.useState<string>(parseEditable(v.precoMatP3));
  const [precoMoM1, setPrecoMoM1] = React.useState<string>(parseEditable(v.precoMoM1));
  const [precoMoM2, setPrecoMoM2] = React.useState<string>(parseEditable(v.precoMoM2));
  const [precoMoM3, setPrecoMoM3] = React.useState<string>(parseEditable(v.precoMoM3));
  const [dataUltAtual, setDataUltAtual] = React.useState<string>(fmtDateBR(v.dataUltAtual));
  const [observacao, setObservacao] = React.useState<string>(v.observacao ?? "");

  // se o registro mudar (re-render vindo do server), atualiza os inputs quando NÃO estiver editando
  React.useEffect(() => {
    if (edit) return;
    setPrecoMatP1(parseEditable(v.precoMatP1));
    setPrecoMatP2(parseEditable(v.precoMatP2));
    setPrecoMatP3(parseEditable(v.precoMatP3));
    setPrecoMoM1(parseEditable(v.precoMoM1));
    setPrecoMoM2(parseEditable(v.precoMoM2));
    setPrecoMoM3(parseEditable(v.precoMoM3));
    setDataUltAtual(fmtDateBR(v.dataUltAtual));
    setObservacao(v.observacao ?? "");
  }, [v, edit]);

  // restaura originais ao cancelar
  const handleCancel = () => {
    setPrecoMatP1(parseEditable(v.precoMatP1));
    setPrecoMatP2(parseEditable(v.precoMatP2));
    setPrecoMatP3(parseEditable(v.precoMatP3));
    setPrecoMoM1(parseEditable(v.precoMoM1));
    setPrecoMoM2(parseEditable(v.precoMoM2));
    setPrecoMoM3(parseEditable(v.precoMoM3));
    setDataUltAtual(fmtDateBR(v.dataUltAtual));
    setObservacao(v.observacao ?? "");
    setEdit(false);
  };

  // submit inline
  const handleSave = async () => {
    if (saving) return;
    setSaving(true);

    try {
      const fd = new FormData();
      fd.set("fornecedorId", String(v.fornecedorId));
      fd.set("produtoId", String(v.produtoId));

      fd.set("precoMatP1", precoMatP1);
      fd.set("precoMatP2", precoMatP2);
      fd.set("precoMatP3", precoMatP3);
      fd.set("precoMoM1", precoMoM1);
      fd.set("precoMoM2", precoMoM2);
      fd.set("precoMoM3", precoMoM3);

      fd.set("dataUltAtual", dataUltAtual); // pode ir vazio, action já trata
      fd.set("observacao", observacao); // pode ir vazio, action já trata

      await onSubmit(fd);

      // ✅ não depende só disso: quem fecha mesmo é o ?ok=1, mas deixo pra UX imediata
      setEdit(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (formData: FormData) => {
    if (deleting) return;
    setDeleting(true);
    try {
      await onDelete(formData);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <tr>
      <td style={cell}>{v.produto?.nome}</td>
      <td style={cell}>{v.fornecedor?.nome}</td>
      <td style={{ ...cell, textAlign: "center" }}>{v.produto?.unidade?.sigla ?? "—"}</td>

      {/* P1 - P3 */}
      <td style={numCell}>
        {edit ? (
          <input
            style={inputCell}
            inputMode="decimal"
            value={precoMatP1}
            onChange={(e) => setPrecoMatP1(e.target.value)}
            placeholder="P1"
          />
        ) : (
          moneyShort(v.precoMatP1)
        )}
      </td>
      <td style={numCell}>
        {edit ? (
          <input
            style={inputCell}
            inputMode="decimal"
            value={precoMatP2}
            onChange={(e) => setPrecoMatP2(e.target.value)}
            placeholder="P2"
          />
        ) : (
          moneyShort(v.precoMatP2)
        )}
      </td>
      <td style={numCell}>
        {edit ? (
          <input
            style={inputCell}
            inputMode="decimal"
            value={precoMatP3}
            onChange={(e) => setPrecoMatP3(e.target.value)}
            placeholder="P3"
          />
        ) : (
          moneyShort(v.precoMatP3)
        )}
      </td>

      {/* M1 - M3 */}
      <td style={numCell}>
        {edit ? (
          <input
            style={inputCell}
            inputMode="decimal"
            value={precoMoM1}
            onChange={(e) => setPrecoMoM1(e.target.value)}
            placeholder="M1"
          />
        ) : (
          moneyShort(v.precoMoM1)
        )}
      </td>
      <td style={numCell}>
        {edit ? (
          <input
            style={inputCell}
            inputMode="decimal"
            value={precoMoM2}
            onChange={(e) => setPrecoMoM2(e.target.value)}
            placeholder="M2"
          />
        ) : (
          moneyShort(v.precoMoM2)
        )}
      </td>
      <td style={numCell}>
        {edit ? (
          <input
            style={inputCell}
            inputMode="decimal"
            value={precoMoM3}
            onChange={(e) => setPrecoMoM3(e.target.value)}
            placeholder="M3"
          />
        ) : (
          moneyShort(v.precoMoM3)
        )}
      </td>

      {/* Data / Obs */}
      <td style={cell}>
        {edit ? (
          <input
            style={inputText}
            value={dataUltAtual}
            onChange={(e) => setDataUltAtual(e.target.value)}
            placeholder="DD/MM/AAAA"
          />
        ) : (
          fmtDateBR(v.dataUltAtual) || "—"
        )}
      </td>
      <td style={cell}>
        {edit ? (
          <input
            style={inputText}
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Obs"
          />
        ) : (
          v.observacao ?? "—"
        )}
      </td>

      {/* Ações */}
      <td style={{ ...cell, whiteSpace: "nowrap", textAlign: "right" }}>
        {!edit ? (
          <>
            <button style={actionBtn} onClick={() => setEdit(true)} disabled={saving || deleting}>
              Editar
            </button>

            <ConfirmDelete
              id={v.id}
              label={`${v.produto?.nome ?? "Produto"} — ${v.fornecedor?.nome ?? "Fornecedor"}`}
              onDelete={handleDelete}
              style={{ ...dangerBtn, marginLeft: 8, opacity: deleting ? 0.7 : 1 }}
            />
          </>
        ) : (
          <>
            <button style={primaryBtn} onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </button>
            <button style={{ ...actionBtn, marginLeft: 8 }} onClick={handleCancel} disabled={saving}>
              Cancelar
            </button>
          </>
        )}
      </td>
    </tr>
  );
}
