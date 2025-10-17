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

    // ⚠️ Projeto NÃO tem createdAt/updatedAt no schema → não envie.
    const projeto = await prisma.projeto.create({
      data: {
        nome,
        status: 'rascunho',
        ...(clienteId ? { clienteId } : {}),
      },
      select: { id: true },
    });

    // cria a estimativa inicial
    await prisma.estimativa.create({
      data: {
        projetoId: projeto.id,
        nome: 'Estimativa',
        // criadaEm já tem @default(now()) no schema
      },
    });

    return NextResponse.json({ id: projeto.id });
  } catch (err: any) {
    const msg = err?.message ?? 'Falha ao criar projeto';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
