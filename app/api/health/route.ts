import { NextResponse } from "next/server";

/** Rota mínima para checar se o Worker responde (sem Supabase / middleware pesado). */
export async function GET() {
  return NextResponse.json({ ok: true }, { status: 200 });
}
