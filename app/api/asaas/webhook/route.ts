import { NextResponse } from "next/server";
import { processAsaasWebhookPayload } from "@/lib/asaas/webhook-handler";

export async function POST(request: Request) {
  const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN?.trim();
  if (process.env.NODE_ENV === "production" && !expectedToken) {
    return NextResponse.json({ error: "Webhook Asaas não configurado (defina ASAAS_WEBHOOK_TOKEN)." }, { status: 503 });
  }
  if (expectedToken) {
    const receivedToken = request.headers.get("asaas-access-token")?.trim() || request.headers.get("x-asaas-token")?.trim();
    if (!receivedToken || receivedToken !== expectedToken) {
      return NextResponse.json({ error: "Webhook não autorizado." }, { status: 401 });
    }
  } else if (process.env.NODE_ENV !== "production") {
    console.warn("[asaas/webhook] ASAAS_WEBHOOK_TOKEN ausente — em produção o webhook fica bloqueado.");
  }

  const payload = (await request.json().catch(() => null)) as Parameters<typeof processAsaasWebhookPayload>[0];
  const result = await processAsaasWebhookPayload(payload);
  if (result.ignored) {
    return NextResponse.json({ ok: true, ignored: true });
  }
  return NextResponse.json({ ok: true });
}
