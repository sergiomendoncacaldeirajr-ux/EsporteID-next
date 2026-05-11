import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/server";

type RegisterFcmBody = {
  token?: string;
  device?: string;
  appVersion?: string;
  active?: boolean;
};

export async function POST(request: Request) {
  const supabase = await createRouteHandlerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, message: "Sessao invalida." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as RegisterFcmBody;
  const token = String(body.token ?? "").trim();
  if (token.length < 20 || token.length > 4096) {
    return NextResponse.json({ ok: false, message: "Token FCM invalido." }, { status: 400 });
  }

  const { error } = await supabase.from("android_fcm_tokens").upsert(
    {
      usuario_id: user.id,
      token,
      device: String(body.device ?? "").slice(0, 120) || null,
      app_version: String(body.appVersion ?? "").slice(0, 40) || null,
      ativo: body.active === false ? false : true,
    },
    { onConflict: "token" }
  );
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
