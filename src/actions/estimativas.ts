// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

/* =========================
   ENUMS
   ========================= */
enum TipoItem {
  PRODUTO
  SERVICO
  AMBOS
}

enum FontePrecoMaterial {
  P1
  P2
  P3
}

enum FontePrecoMO {
  M1
  M2
  M3
}

enum Role {
  ADM
  USER
}

/* =========================
   CADASTROS
   ========================= */

model UnidadeMedida {
  id         Int      @id @default(autoincrement())
  usuarioId  Int
  usuario    Usuario  @relation(fields: [usuarioId], references: [id], onDelete: Cascade)

  sigla      String
  nome       String

  produtos   ProdutoServico[]
  itens      EstimativaItem[] // UM sugerida/override por item

  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@unique([usuarioId, sigla])
  @@index([usuarioId])
}

model ProdutoServico {
  id              Int           @id @default(autoincrement())
  usuarioId       Int
  usuario         Usuario       @relation(fields: [usuarioId], references: [id], onDelete: Cascade)

  nome            String
  categoria       String?
  unidadeMedidaId Int
  unidade         UnidadeMedida @relation(fields: [unidadeMedidaId], references: [id])

  fornecedores    FornecedorProduto[]
  itens           EstimativaItem[]

  // 👇 relação inversa para ajustes financeiros por produto
  financeirosAjustes FinanceiroAjuste[]

  tipo        TipoItem @default(AMBOS)
  refPrecoP1  Decimal? @db.Decimal(12, 2)
  refPrecoP2  Decimal? @db.Decimal(12, 2)
  refPrecoP3  Decimal? @db.Decimal(12, 2)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([usuarioId, nome])
  @@index([usuarioId])
}

model Fornecedor {
  id         Int      @id @default(autoincrement())
  usuarioId  Int
  usuario    Usuario  @relation(fields: [usuarioId], references: [id], onDelete: Cascade)

  nome       String
  cnpjCpf    String?
  contato    String?

  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  produtos   FornecedorProduto[]
  itens      EstimativaItem[] @relation("FornecedorItens")

  @@unique([usuarioId, cnpjCpf])
  @@index([usuarioId, nome])
  @@index([usuarioId])
  @@unique([id, usuarioId], name: "Fornecedor_id_usuarioId_key")
}

model FornecedorProduto {
  id           Int      @id @default(autoincrement())
  usuarioId    Int
  usuario      Usuario  @relation(fields: [usuarioId], references: [id], onDelete: Cascade)

  fornecedorId Int
  produtoId    Int

  fornecedor   Fornecedor     @relation(fields: [fornecedorId], references: [id], onDelete: Cascade)
  produto      ProdutoServico @relation(fields: [produtoId], references: [id], onDelete: Cascade)

  // 3 preços Materiais
  precoMatP1   Decimal? @db.Decimal(12, 2)
  precoMatP2   Decimal? @db.Decimal(12, 2)
  precoMatP3   Decimal? @db.Decimal(12, 2)

  // 3 preços Mão de Obra
  precoMoM1    Decimal? @db.Decimal(12, 2)
  precoMoM2    Decimal? @db.Decimal(12, 2)
  precoMoM3    Decimal? @db.Decimal(12, 2)

  dataUltAtual DateTime @default(now())
  observacao   String?

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@unique([usuarioId, fornecedorId, produtoId])
  @@index([usuarioId])
  @@index([fornecedorId])
  @@index([produtoId])
}

model ClienteUsuario {
  id        Int     @id @default(autoincrement())
  usuarioId Int
  usuario   Usuario @relation(fields: [usuarioId], references: [id], onDelete: Cascade)

  nome      String
  cpf       String?
  cnpj      String?
  email     String?
  telefone  String?
  endereco  String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  projetos  Projeto[]

  // Unicidade por usuário (permitindo nulls em Postgres)
  @@unique([usuarioId, cpf])
  @@unique([usuarioId, cnpj])
  @@unique([usuarioId, email])

  @@index([usuarioId, nome])
  @@index([usuarioId])
}

/* =========================
   PROJETOS & ESTIMATIVAS
   ========================= */

model Projeto {
  id         Int      @id @default(autoincrement())
  usuarioId  Int
  usuario    Usuario  @relation(fields: [usuarioId], references: [id], onDelete: Cascade)

  nome       String
  status     String   @default("rascunho") // rascunho | com_estimativa | aprovado | execucao | concluido

  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  clienteId  Int?
  cliente    ClienteUsuario? @relation(fields: [clienteId], references: [id], onDelete: SetNull)

  estimativas Estimativa[]

  // 👇 financeiro por projeto
  financeirosAjustes FinanceiroAjuste[]
  financeiroResumo   FinanceiroResumo?

  // legado (mantido se já usado em algum lugar)
  resumo      ResumoProjeto?

  @@index([usuarioId, status])
  @@index([clienteId])
  @@index([usuarioId])
}

model Estimativa {
  id         Int      @id @default(autoincrement())
  usuarioId  Int
  usuario    Usuario  @relation(fields: [usuarioId], references: [id], onDelete: Cascade)

  projetoId  Int
  projeto    Projeto  @relation(fields: [projetoId], references: [id], onDelete: Cascade)

  nome       String   @default("Estimativa")
  criadaEm   DateTime @default(now())
  aprovada   Boolean  @default(false)

  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  itens      EstimativaItem[]

  @@index([usuarioId, projetoId])
  @@index([usuarioId])
}

model EstimativaItem {
  id            Int      @id @default(autoincrement())
  usuarioId     Int
  usuario       Usuario  @relation(fields: [usuarioId], references: [id], onDelete: Cascade)

  estimativaId  Int
  estimativa    Estimativa @relation(fields: [estimativaId], references: [id], onDelete: Cascade)

  produtoId     Int
  produto       ProdutoServico @relation(fields: [produtoId], references: [id])

  quantidade    Decimal @db.Decimal(12, 3)

  unidadeId     Int
  unidade       UnidadeMedida @relation(fields: [unidadeId], references: [id])

  fornecedorId  Int
  fornecedor    Fornecedor @relation("FornecedorItens", fields: [fornecedorId], references: [id])

  fontePrecoMat FontePrecoMaterial?
  fontePrecoMo  FontePrecoMO?

  valorUnitMat  Decimal? @db.Decimal(12, 2)
  valorUnitMo   Decimal? @db.Decimal(12, 2)

  totalItem     Decimal? @db.Decimal(12, 2)

  // 👇 relação inversa para ajustes financeiros aplicados a este item
  financeirosAjustes FinanceiroAjuste[]

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([usuarioId, estimativaId])
  @@index([produtoId])
  @@index([unidadeId])
  @@index([fornecedorId])
  @@index([usuarioId])
}

/* =========================
   FINANCEIRO (NOVO)
   ========================= */

/**
 * Ajustes financeiros aplicados:
 * - por ITEM (estimativaItemId)
 * - por PRODUTO específico (produtoId)
 * - por PROJETO (nenhum dos dois acima preenchido)
 * Permite aplicar % (markup/desconto) e/ou valor fixo.
 */
model FinanceiroAjuste {
  id               Int      @id @default(autoincrement())
  usuarioId        Int
  usuario          Usuario  @relation(fields: [usuarioId], references: [id], onDelete: Cascade)

  projetoId        Int
  projeto          Projeto  @relation(fields: [projetoId], references: [id], onDelete: Cascade)

  estimativaItemId Int?
  estimativaItem   EstimativaItem? @relation(fields: [estimativaItemId], references: [id], onDelete: SetNull)

  produtoId        Int?
  produto          ProdutoServico? @relation(fields: [produtoId], references: [id], onDelete: SetNull)

  // +10.00 = +10%  |  -5.00 = -5%
  percentual       Decimal? @db.Decimal(7, 3)

  // Acrescimo/desconto fixo em R$
  valorFixo        Decimal? @db.Decimal(14, 2)

  observacao       String?

  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  @@index([usuarioId])
  @@index([projetoId])
  @@index([estimativaItemId])
  @@index([produtoId])
}

/**
 * Resumo “cacheado” por projeto para a tela Financeiro,
 * atualizado quando o usuário salva os ajustes. Pode ser
 * recalculado sob demanda.
 */
model FinanceiroResumo {
  id               Int      @id @default(autoincrement())
  usuarioId        Int
  usuario          Usuario  @relation(fields: [usuarioId], references: [id], onDelete: Cascade)

  projetoId        Int      @unique
  projeto          Projeto  @relation(fields: [projetoId], references: [id], onDelete: Cascade)

  subtotalMateriais Decimal  @default(0) @db.Decimal(14, 2)
  subtotalMO        Decimal  @default(0) @db.Decimal(14, 2)
  ajustesTotal      Decimal  @default(0) @db.Decimal(14, 2)
  honorarios        Decimal  @default(0) @db.Decimal(14, 2)
  totalOrcamento    Decimal  @default(0) @db.Decimal(14, 2)

  recebemos         Decimal  @default(0) @db.Decimal(14, 2)
  observacoes       String?

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([usuarioId])
  @@index([projetoId])
}

/* =========================
   RESUMO FINANCEIRO (LEGADO)
   ========================= */

model ResumoProjeto {
  projetoId   Int     @id
  projeto     Projeto @relation(fields: [projetoId], references: [id], onDelete: Cascade)
  recebemos   Decimal @db.Decimal(14, 2)
  observacoes String?
}

/* =========================
   USUÁRIOS
   ========================= */

model Usuario {
  id             Int     @id @default(autoincrement())
  supabaseUserId String  @unique
  nome           String
  cpf            String? @unique
  email          String  @unique
  telefone       String?
  cnpj           String?
  role           Role    @default(USER)

  // relações "filhas"
  unidades       UnidadeMedida[]
  produtos       ProdutoServico[]
  fornecedores   Fornecedor[]
  vinculos       FornecedorProduto[]
  projetos       Projeto[]
  estimativas    Estimativa[]
  itens          EstimativaItem[]
  clientes       ClienteUsuario[]

  // 👇 novas relações para financeiro
  financeirosAjustes FinanceiroAjuste[]
  financeiroResumos  FinanceiroResumo[]

  @@index([email])
}
