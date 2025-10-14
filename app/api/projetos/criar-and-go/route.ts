import { NextResponse } from 'next/server';
import { criarProjetoAndGo } from '@/actions/estimativas';

export async function POST(req: Request) {
  const formData = await req.formData();
  const result = await criarProjetoAndGo(formData);
  return NextResponse.json(result);
}
