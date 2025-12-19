import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

import { prisma } from "@/lib/prisma";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { authUser } from "@/lib/authUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** extensões tipadas do WorkSheet (sem any) */
type Freeze = { xSplit: number; ySplit: number };
type AutoFilter = { ref: string };
type WorkSheetExt = XLSX.WorkSheet & {
  "!freeze"?: Freeze;
  "!autofilter"?: AutoFilter;
};

/** estilo simples tipado (sem usar XLSX.CellStyle que não existe no seu types) */
type SimpleCellStyle = {
  font?: { bold?: boolean };
  alignment?: { horizontal?: "left" | "center" | "right" };
};

type CellWithStyle = XLSX.CellObject & { s?: SimpleCellStyle };

const moneyBR = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function fmtAjuste(tipo: string | null, valor: unknown) {
  const n = Number(valor ?? 0);
  if (!tipo || !Number.isFinite(n) || n === 0) return "—";
  if (tipo === "percent") return `${n}%`;
  return moneyBR(n);
}

function addr(r: number, c: number) {
  return XLSX.utils.encode_cell({ r, c });
}

function setBold(ws: XLSX.WorkSheet, r: number, c: number) {
  const a = addr(r, c);
  const cell = ws[a] as CellWithStyle | undefined;
  if (!cell) return;
  cell.s = { ...(cell.s ?? {}), font: { ...(cell.s?.font ?? {}), bold: true } };
}

function setAlign(
  ws: XLSX.WorkSheet,
  r: number,
  c: number,
  horizontal: "left" | "center" | "right"
) {
  const a = addr(r, c);
  const cell = ws[a] as CellWithStyle | undefined;
  if (!cell) return;
  cell.s = {
    ...(cell.s ?? {}),
    alignment: { ...(cell.s?.alignment ?? {}), horizontal },
  };
}

/** Formato numérico (z). Ex: "#,##0.00" ou "R$ #,##0.00" */
function setNumberFormat(ws: XLSX.WorkSheet, r: number, c: number, fmt: string) {
  const a = addr(r, c);
  const cell = ws[a] as XLSX.CellObject | undefined;
  if (!cell) return;
  cell.z = fmt;
}

function setCols(ws: XLSX.WorkSheet, widths: number[]) {
  ws["!cols"] = widths.map((wch) => ({ wch })) as XLSX.ColInfo[];
}

function safeFileName(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  // auth (mantém seu padrão)
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const projetoId = Number(id);
  if (!projetoId) {
    return NextResponse.json({ error: "Projeto inválido." }, { status: 400 });
  }

  // usuarioId (mesma regra das actions)
  const { id: usuarioId } = await authUser();

  // projeto + última estimativa + itens
  const projeto = await prisma.projeto.findFirst({
    where: { id: projetoId, usuarioId },
    include: {
      cliente: { select: { nome: true, responsavel: true } },
      estimativas: {
        where: { usuarioId },
        orderBy: { id: "desc" },
        take: 1,
        include: {
          itens: {
            orderBy: { id: "asc" },
            select: {
              id: true,
              produtoId: true,
              fornecedorId: true,
              unidadeId: true,
              quantidade: true,
              valorUnitMat: true,
              valorUnitMo: true,
              ajusteTipo: true,
              ajusteValor: true,
              totalItem: true, // ✅ total com ajustes já calculado
            },
          },
        },
      },
    },
  });

  if (!projeto) {
    return NextResponse.json({ error: "Projeto não encontrado." }, { status: 404 });
  }

  const est = projeto.estimativas?.[0];
  const itens = est?.itens ?? [];

  // mapas nomes
  const [produtos, fornecedores, unidades] = await Promise.all([
    prisma.produtoServico.findMany({
      where: { usuarioId },
      select: { id: true, nome: true },
    }),
    prisma.fornecedor.findMany({
      where: { usuarioId },
      select: { id: true, nome: true },
    }),
    prisma.unidadeMedida.findMany({
      where: { usuarioId },
      select: { id: true, sigla: true },
    }),
  ]);

  const produtoMap = new Map(produtos.map((p) => [p.id, p.nome ?? "—"]));
  const fornecedorMap = new Map(fornecedores.map((f) => [f.id, f.nome ?? "—"]));
  const unidadeMap = new Map(unidades.map((u) => [u.id, u.sigla ?? "—"]));

  // ✅ total geral (com ajustes) = soma totalItem
  const totalGeral = itens.reduce((acc, it) => acc + Number(it.totalItem ?? 0), 0);

  // workbook
  const wb = XLSX.utils.book_new();

  // ==========================
  // ABA RESUMO (bonitinha)
  // ==========================
  const resumoAoa: (string | number)[][] = [
    ["ORÇAMENTO DO PROJETO", ""],
    ["Projeto", `#${projeto.id} — ${projeto.nome}`],
    ["Cliente", projeto.cliente?.nome ?? "—"],
    ["Responsável", projeto.cliente?.responsavel ?? "—"],
    ["Status", String(projeto.status ?? "—").toUpperCase()],
    ["Estimativa ID", est?.id ?? "—"],
    [""],
    ["Total (geral)", totalGeral],
  ];

  const wsResumo = XLSX.utils.aoa_to_sheet(resumoAoa) as WorkSheetExt;

  // larguras
  setCols(wsResumo, [22, 60]);

  // título
  setBold(wsResumo, 0, 0);
  setAlign(wsResumo, 0, 0, "left");

  // labels em negrito
  for (let r = 1; r <= 5; r++) setBold(wsResumo, r, 0);
  setBold(wsResumo, 7, 0);

  // formata o total como moeda (linha 8 => índice 7)
  setNumberFormat(wsResumo, 7, 1, '"R$" #,##0.00');

  XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");

  // ==========================
  // ABA ITENS (tabela bonita)
  // ==========================
  const header = [
    "ID",
    "Produto",
    "Fornecedor",
    "Un",
    "Qtd",
    "Mat (unit)",
    "MO (unit)",
    "Ajuste",
    "Total (item)",
  ];

  const rows: (string | number)[][] = itens.map((it) => {
    const qtd = Number(it.quantidade ?? 0);
    const mat = Number(it.valorUnitMat ?? 0);
    const mo = Number(it.valorUnitMo ?? 0);
    const totalItem = Number(it.totalItem ?? 0);

    return [
      it.id,
      produtoMap.get(it.produtoId) ?? "—",
      it.fornecedorId != null ? fornecedorMap.get(it.fornecedorId) ?? "—" : "—",
      it.unidadeId != null ? unidadeMap.get(it.unidadeId) ?? "—" : "—",
      qtd,
      mat,
      mo,
      fmtAjuste(it.ajusteTipo ?? null, it.ajusteValor),
      totalItem,
    ];
  });

  // rodapé com total geral
  const footer: (string | number)[][] = [
    [""],
    ["", "", "", "", "", "", "", "TOTAL GERAL", totalGeral],
  ];

  const itensAoa = [header, ...rows, ...footer];

  const wsItens = XLSX.utils.aoa_to_sheet(itensAoa) as WorkSheetExt;

  // larguras
  setCols(wsItens, [6, 34, 26, 8, 10, 14, 14, 14, 16]);

  // header em negrito + alinhamento
  for (let c = 0; c < header.length; c++) {
    setBold(wsItens, 0, c);
    setAlign(wsItens, 0, c, c === 0 ? "center" : "left");
  }

  // freeze no cabeçalho
  wsItens["!freeze"] = { xSplit: 0, ySplit: 1 };

  // autofilter no cabeçalho
  const ref = wsItens["!ref"] ?? "A1:I1";
  const range = XLSX.utils.decode_range(ref);
  wsItens["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: 0, c: range.e.c },
    }),
  };

  // formata números (linhas de dados começam em r=1)
  // colunas: Qtd=4, Mat=5, MO=6, Total=8
  for (let r = 1; r <= rows.length; r++) {
    setNumberFormat(wsItens, r, 4, "#,##0.00");
    setNumberFormat(wsItens, r, 5, '"R$" #,##0.00');
    setNumberFormat(wsItens, r, 6, '"R$" #,##0.00');
    setNumberFormat(wsItens, r, 8, '"R$" #,##0.00');
  }

  // footer: "TOTAL GERAL" negrito + moeda
  const footerRowIndex = 1 + rows.length + 1; // header(0) + rows + blank row
  setBold(wsItens, footerRowIndex, 7);
  setBold(wsItens, footerRowIndex, 8);
  setAlign(wsItens, footerRowIndex, 7, "right");
  setNumberFormat(wsItens, footerRowIndex, 8, '"R$" #,##0.00');

  XLSX.utils.book_append_sheet(wb, wsItens, "Itens");

  // buffer
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const filename = `projeto_${projeto.id}_${safeFileName(projeto.nome)}_orcamento.xlsx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
