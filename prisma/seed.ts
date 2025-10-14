// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // 1) Unidades
  const [m2, un, h] = await Promise.all([
    prisma.unidadeMedida.upsert({
      where: { sigla: "m²" },
      update: {},
      create: { sigla: "m²", nome: "Metro quadrado" },
    }),
    prisma.unidadeMedida.upsert({
      where: { sigla: "un" },
      update: {},
      create: { sigla: "un", nome: "Unidade" },
    }),
    prisma.unidadeMedida.upsert({
      where: { sigla: "h" },
      update: {},
      create: { sigla: "h", nome: "Hora" },
    }),
  ]);

  // 2) Produtos/Serviços
  const [pintura, eletrica, perfilU] = await Promise.all([
    prisma.produtoServico.create({
      data: { nome: "Pintura de parede", categoria: "Acabamento", unidadeMedidaId: m2.id },
    }),
    prisma.produtoServico.create({
      data: { nome: "Instalação elétrica", categoria: "Elétrica", unidadeMedidaId: h.id },
    }),
    prisma.produtoServico.create({
      data: { nome: "Perfil metálico U", categoria: "Materiais", unidadeMedidaId: un.id },
    }),
  ]);

  // 3) Fornecedores
  const [alpha, beta, xyz] = await Promise.all([
    prisma.fornecedor.create({
      data: { nome: "Alpha Construções", cnpjCpf: "12.345.678/0001-99", contato: "alpha@exemplo.com" },
    }),
    prisma.fornecedor.create({
      data: { nome: "Beta Elétrica", cnpjCpf: "98.765.432/0001-11", contato: "beta@exemplo.com" },
    }),
    prisma.fornecedor.create({
      data: { nome: "Materiais XYZ", cnpjCpf: "33.222.111/0001-55", contato: "xyz@exemplo.com" },
    }),
  ]);

  // 4) Vínculos Fornecedor-Produto com 3 preços (Materiais e MO)
  await Promise.all([
    prisma.fornecedorProduto.create({
      data: {
        fornecedorId: alpha.id,
        produtoId: pintura.id,
        precoMatP1: 35, precoMatP2: 32, precoMatP3: 30,
        precoMoM1: 25,  precoMoM2: 22,  precoMoM3: 20,
        dataUltAtual: new Date(),
        observacao: "Tabela 09/2025",
      },
    }),
    prisma.fornecedorProduto.create({
      data: {
        fornecedorId: beta.id,
        produtoId: eletrica.id,
        // elétrica: só MO
        precoMoM1: 80, precoMoM2: 75, precoMoM3: 70,
        dataUltAtual: new Date(),
        observacao: "Tabela 08/2025",
      },
    }),
    prisma.fornecedorProduto.create({
      data: {
        fornecedorId: xyz.id,
        produtoId: perfilU.id,
        // perfil: só material
        precoMatP1: 120, precoMatP2: 110, precoMatP3: 105,
        dataUltAtual: new Date(),
        observacao: "Tabela 09/2025",
      },
    }),
  ]);

  // 5) Projeto + Estimativa (com itens) + Resumo (recebemos=0)
  const projeto = await prisma.projeto.create({
    data: { nome: "Arauco SP", cliente: "Cliente Demo", status: "com_estimativa" },
  });

  const estimativa = await prisma.estimativa.create({
    data: { projetoId: projeto.id, nome: "Estimativa V1", aprovada: true }, // já aprovada p/ facilitar
  });

  // Itens da estimativa (escolhas de P e M congeladas em valorUnit*)
  // Pintura: usa P2 (32) + M2 (22) — qtd 120 m²
  // Elétrica: usa M1 (80) — qtd 40 h
  // Perfil U: usa P3 (105) — qtd 50 un
  await prisma.estimativaItem.createMany({
    data: [
      {
        estimativaId: estimativa.id,
        produtoId: pintura.id,
        quantidade: 120,
        unidadeId: m2.id,
        fornecedorId: alpha.id,
        fontePrecoMat: "P2",
        fontePrecoMo: "M2",
        valorUnitMat: 32,
        valorUnitMo: 22,
        totalItem: 120 * (32 + 22),
      },
      {
        estimativaId: estimativa.id,
        produtoId: eletrica.id,
        quantidade: 40,
        unidadeId: h.id,
        fornecedorId: beta.id,
        fontePrecoMo: "M1",
        valorUnitMo: 80,
        totalItem: 40 * (80),
      },
      {
        estimativaId: estimativa.id,
        produtoId: perfilU.id,
        quantidade: 50,
        unidadeId: un.id,
        fornecedorId: xyz.id,
        fontePrecoMat: "P3",
        valorUnitMat: 105,
        totalItem: 50 * (105),
      },
    ],
  });

  // Resumo (anotação): recebemos 0 por enquanto
  await prisma.resumoProjeto.create({
    data: { projetoId: projeto.id, recebemos: 0, observacoes: "Inicial" },
  });

  console.log("✅ Seed concluído.");
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
