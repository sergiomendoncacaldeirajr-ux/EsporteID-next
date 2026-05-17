import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/server";
import { createServiceRoleClient, hasServiceRoleConfig } from "@/lib/supabase/service-role";

type RegisterFcmBody = {
  token?: string;
  device?: string;
  appVersion?: string;
  active?: boolean;
  platform?: string;
};

export async function POST(request: Request) {
  const supabase = await createRouteHandlerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, message: "Sessao invalida." }, { status: 401 });
  if (!hasServiceRoleConfig()) {
    return NextResponse.json({ ok: false, message: "Push Android indisponivel no servidor." }, { status: 500 });
  }

  const body = (await request.json().catch(() => ({}))) as RegisterFcmBody;
  const token = String(body.token ?? "").trim();
  if (token.length < 20 || token.length > 4096) {
    return NextResponse.json({ ok: false, message: "Token FCM invalido." }, { status: 400 });
  }

  const platform = String(body.platform ?? "android").trim().toLowerCase() === "ios" ? "ios" : "android";

  const admin = createServiceRoleClient();
  const { error } = await admin.from("android_fcm_tokens").upsert(
    {
      usuario_id: user.id,
      token,
      device: String(body.device ?? "").slice(0, 120) || null,
      app_version: String(body.appVersion ?? "").slice(0, 40) || null,
      ativo: body.active === false ? false : true,
      platform,
    },
    { onConflict: "token" }
  );
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
