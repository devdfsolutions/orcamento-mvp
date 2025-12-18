import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const supabase = await getSupabaseServer();

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ user: null }, { status: 401 });

  const u = await prisma.usuario.findUnique({
    where: { supabaseUserId: user.id },
    select: { id: true, nome: true, email: true, role: true },
  });

  return NextResponse.json(u ?? { user: null });
}
