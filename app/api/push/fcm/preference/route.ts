import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/server";

type PreferenceBody = {
  active?: boolean;
};

export async function GET() {
  const supabase = await createRouteHandlerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, message: "Sessao invalida." }, { status: 401 });

  const { data, error } = await supabase
    .from("android_fcm_tokens")
    .select("id, ativo")
    .eq("usuario_id", user.id)
    .order("criado_em", { ascending: false })
    .limit(20);
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 });

  const rows = data ?? [];
  return NextResponse.json({
    ok: true,
    enabled: rows.some((row) => row.ativo === true),
    hasToken: rows.length > 0,
  });
}

export async function POST(request: Request) {
  const supabase = await createRouteHandlerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, message: "Sessao invalida." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as PreferenceBody;
  const active = body.active === true;

  const { data, error } = await supabase
    .from("android_fcm_tokens")
    .update({ ativo: active })
    .eq("usuario_id", user.id)
    .select("id");
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 });

  if (active && !(data ?? []).length) {
    return NextResponse.json(
      { ok: false, message: "Abra o app novamente para concluir a ativação das notificações." },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, enabled: active, hasToken: Boolean((data ?? []).length) });
}
