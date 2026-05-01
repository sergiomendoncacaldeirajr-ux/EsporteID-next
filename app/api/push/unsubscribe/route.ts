import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/server";

export const preferredRegion = ["gru1"];

export async function POST(request: Request) {
  const supabase = await createRouteHandlerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, message: "Sessão inválida." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { endpoint?: string };
  if (!body.endpoint) return NextResponse.json({ ok: false, message: "Endpoint inválido." }, { status: 400 });

  const { error } = await supabase
    .from("push_subscriptions")
    .update({ ativo: false })
    .eq("usuario_id", user.id)
    .eq("endpoint", body.endpoint);
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
