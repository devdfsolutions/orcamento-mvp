// app/api/projetos/criar-and-go/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const nome = String(form.get('nome') ?? '').trim();
    const clienteIdRaw = form.get('clienteId');
    const clienteId = clienteIdRaw ? Number(clienteIdRaw) : null;

    if (!nome) {
      return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 });
    }

    const now = new Date();

    // cria o projeto já preenchendo os timestamps
    const projeto = await prisma.projeto.create({
      data: {
        nome,
        status: 'rascunho',
        createdAt: now,
        updatedAt: now,
        ...(clienteId ? { clienteId } : {}),
      },
      select: { id: true },
    });

    // cria a estimativa inicial (se já existir default no schema, ok)
    await prisma.estimativa.create({
      data: {
        projetoId: projeto.id,
        nome: 'Estimativa',
        // criadaEm já tem @default(now()) no schema
      },
    });

    return NextResponse.json({ id: projeto.id });
  } catch (err: any) {
    // devolve a mensagem de erro do Prisma para aparecer no form
    const msg = err?.message ?? 'Falha ao criar projeto';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
