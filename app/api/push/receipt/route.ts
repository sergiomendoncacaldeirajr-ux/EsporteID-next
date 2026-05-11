import { NextResponse } from "next/server";
import { createServiceRoleClient, hasServiceRoleConfig } from "@/lib/supabase/service-role";

type ReceiptBody = {
  endpoint?: string;
  notificationId?: number | string | null;
  status?: string;
  error?: string | null;
};

function normalizeStatus(status: string | undefined) {
  const s = String(status ?? "").toLowerCase().trim();
  if (s === "received" || s === "shown" || s === "failed") return s;
  return "received";
}

export async function POST(request: Request) {
  if (!hasServiceRoleConfig()) {
    return NextResponse.json({ ok: false, message: "Service role ausente." }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as ReceiptBody;
  const endpoint = String(body.endpoint ?? "").trim();
  const notificationId = Number(body.notificationId ?? 0);
  if (!endpoint || !Number.isFinite(notificationId) || notificationId < 1) {
    return NextResponse.json({ ok: false, message: "Recibo push invalido." }, { status: 400 });
  }

  const db = createServiceRoleClient();
  const { data: sub, error: subErr } = await db
    .from("push_subscriptions")
    .select("id")
    .eq("endpoint", endpoint)
    .maybeSingle();
  if (subErr) return NextResponse.json({ ok: false, message: subErr.message }, { status: 400 });
  const subId = Number((sub as { id?: number } | null)?.id ?? 0);
  if (!Number.isFinite(subId) || subId < 1) return NextResponse.json({ ok: true, skipped: true });

  const status = normalizeStatus(body.status);
  const ultimoErro =
    status === "failed"
      ? String(body.error ?? "sw_showNotification_failed").slice(0, 600)
      : null;
  const { error } = await db
    .from("push_entregas_notificacao")
    .update({ status, ultimo_erro: ultimoErro })
    .eq("notificacao_id", notificationId)
    .eq("subscription_id", subId);
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
