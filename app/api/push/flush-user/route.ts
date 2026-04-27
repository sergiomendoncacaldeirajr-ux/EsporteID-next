import { NextResponse } from "next/server";
import { dispatchPushForNotificationIds } from "@/lib/pwa/push-dispatch";
import { createRouteHandlerClient } from "@/lib/supabase/server";
import { createServiceRoleClient, hasServiceRoleConfig } from "@/lib/supabase/service-role";

export async function POST() {
  try {
    if (!hasServiceRoleConfig()) {
      return NextResponse.json({ ok: false, reason: "service_role_missing" }, { status: 200 });
    }
    const supabase = await createRouteHandlerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });

    const { data: unreadRows } = await supabase
      .from("notificacoes")
      .select("id")
      .eq("usuario_id", user.id)
      .eq("lida", false)
      .order("id", { ascending: false })
      .limit(40);
    const ids = (unreadRows ?? [])
      .map((r) => Number((r as { id?: number })?.id ?? 0))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (!ids.length) return NextResponse.json({ ok: true, sent: 0, scanned: 0, failed: 0 });

    const admin = createServiceRoleClient();
    const result = await dispatchPushForNotificationIds(admin, ids);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "push_flush_failed" },
      { status: 500 }
    );
  }
}

