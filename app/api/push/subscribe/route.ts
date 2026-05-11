import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/server";

type PushPayload = {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
};

export async function POST(request: Request) {
  const supabase = await createRouteHandlerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, message: "Sessão inválida." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { subscription?: PushPayload };
  const sub = body.subscription;
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return NextResponse.json({ ok: false, message: "Assinatura push inválida." }, { status: 400 });
  }

  const ua = request.headers.get("user-agent");
  const { data: existing, error: existingError } = await supabase
    .from("push_subscriptions")
    .select("id, ativo")
    .eq("usuario_id", user.id)
    .eq("endpoint", sub.endpoint)
    .maybeSingle();
  if (existingError) return NextResponse.json({ ok: false, message: existingError.message }, { status: 400 });
  if (existing && existing.ativo === false) {
    return NextResponse.json(
      {
        ok: false,
        recreate: true,
        message: "Assinatura push expirada. Recrie a subscription no dispositivo.",
      },
      { status: 409 }
    );
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      usuario_id: user.id,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      user_agent: ua,
      ativo: true,
    },
    { onConflict: "endpoint" }
  );
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
