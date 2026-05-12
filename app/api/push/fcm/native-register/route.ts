import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/server";
import { createServiceRoleClient, hasServiceRoleConfig } from "@/lib/supabase/service-role";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = String(url.searchParams.get("token") ?? "").trim();
  const appVersion = String(url.searchParams.get("appVersion") ?? "7.0.3").slice(0, 40);
  const redirectUrl = new URL("/", url.origin);

  if (token.length < 20 || token.length > 4096) {
    return NextResponse.redirect(redirectUrl);
  }

  const supabase = await createRouteHandlerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirectUrl.searchParams.set("eid_fcm_token", token);
    return NextResponse.redirect(redirectUrl);
  }
  if (!hasServiceRoleConfig()) {
    redirectUrl.searchParams.set("eid_fcm_token", token);
    return NextResponse.redirect(redirectUrl);
  }

  const admin = createServiceRoleClient();
  await admin.from("android_fcm_tokens").upsert(
    {
      usuario_id: user.id,
      token,
      device: "Android/App",
      app_version: appVersion,
      ativo: true,
    },
    { onConflict: "token" }
  );

  return NextResponse.redirect(redirectUrl);
}
