import { NextResponse } from "next/server";
import { dispatchPushForNotificationIds, isPushDispatchConfigured } from "@/lib/pwa/push-dispatch";
import { createServiceRoleClient, hasServiceRoleConfig } from "@/lib/supabase/service-role";

export const preferredRegion = ["gru1"];

/**
 * Webhook (ex.: Supabase Database Webhook em INSERT em `public.notificacoes`).
 * Configure `EID_PUSH_WEBHOOK_SECRET` e envie Authorization: Bearer <secret>.
 * Corpo aceito: payload do Supabase (`record.id`) ou `{ "notificacao_id": number }`.
 */
export async function POST(req: Request) {
  try {
    const expected = String(process.env.EID_PUSH_WEBHOOK_SECRET ?? "").trim();
    if (!expected) {
      return NextResponse.json({ ok: false, reason: "hook_secret_missing" }, { status: 503 });
    }
    const auth = req.headers.get("authorization") ?? "";
    const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
    const headerSecret = req.headers.get("x-eid-push-secret")?.trim() ?? "";
    if (bearer !== expected && headerSecret !== expected) {
      return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
    }
    if (!hasServiceRoleConfig() || !isPushDispatchConfigured()) {
      return NextResponse.json({ ok: false, reason: "push_not_configured" }, { status: 200 });
    }

    const body = (await req.json().catch(() => null)) as
      | { record?: { id?: unknown }; notificacao_id?: unknown }
      | null;
    const rawId = body?.record?.id ?? body?.notificacao_id;
    const id = Number(rawId);
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ ok: false, reason: "invalid_notificacao_id" }, { status: 400 });
    }

    const admin = createServiceRoleClient();
    const result = await dispatchPushForNotificationIds(admin, [Math.floor(id)]);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "push_hook_failed" },
      { status: 200 }
    );
  }
}
