import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";

type NotificacaoRow = {
  id: number;
  usuario_id: string;
  mensagem: string | null;
  tipo: string | null;
  referencia_id: number | null;
};

type PushSubRow = {
  id: number;
  usuario_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

type PushDeliveryRow = {
  notificacao_id: number;
  subscription_id: number;
  status: string;
};

function normalizePushConfig() {
  const publicKey = String(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "").trim();
  const privateKey = String(process.env.VAPID_PRIVATE_KEY ?? "").trim();
  const subject = String(process.env.VAPID_SUBJECT ?? "mailto:suporte@esporteid.com").trim();
  if (!publicKey || !privateKey) {
    throw new Error("VAPID não configurado. Defina NEXT_PUBLIC_VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY.");
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

function buildNotificationPayload(n: NotificacaoRow): string {
  const tipo = String(n.tipo ?? "").toLowerCase();
  const title = tipo.includes("professor")
    ? "EsporteID · Aulas"
    : tipo.includes("time") || tipo.includes("convite")
      ? "EsporteID · Equipe"
      : "EsporteID";
  const body = String(n.mensagem ?? "Você recebeu uma nova notificação.");
  const url = tipo.includes("professor")
    ? "/comunidade#aulas"
    : tipo.includes("time") || tipo.includes("convite")
      ? "/comunidade"
      : "/comunidade#notificacoes";
  return JSON.stringify({
    title,
    body,
    url,
    tag: `notif-${n.id}`,
  });
}

export async function dispatchPendingPushNotifications(
  admin: SupabaseClient,
  opts?: { batchSize?: number }
): Promise<{ sent: number; failed: number; scanned: number }> {
  normalizePushConfig();
  const batchSize = Math.max(1, Math.min(500, Number(opts?.batchSize ?? 150)));

  const { data: notificacoes, error: notifErr } = await admin
    .from("notificacoes")
    .select("id, usuario_id, mensagem, tipo, referencia_id")
    .eq("lida", false)
    .order("id", { ascending: false })
    .limit(batchSize);
  if (notifErr) throw new Error(`Falha ao buscar notificações: ${notifErr.message}`);

  const list = (notificacoes ?? []) as NotificacaoRow[];
  if (!list.length) return { sent: 0, failed: 0, scanned: 0 };

  const userIds = [...new Set(list.map((n) => n.usuario_id).filter(Boolean))];
  const notifIds = list.map((n) => n.id);

  const [{ data: subs, error: subErr }, { data: deliveries, error: delErr }] = await Promise.all([
    admin
      .from("push_subscriptions")
      .select("id, usuario_id, endpoint, p256dh, auth")
      .eq("ativo", true)
      .in("usuario_id", userIds),
    admin
      .from("push_entregas_notificacao")
      .select("notificacao_id, subscription_id, status")
      .in("notificacao_id", notifIds),
  ]);
  if (subErr) throw new Error(`Falha ao buscar subscriptions: ${subErr.message}`);
  if (delErr) throw new Error(`Falha ao buscar entregas de push: ${delErr.message}`);

  const subByUser = new Map<string, PushSubRow[]>();
  for (const s of (subs ?? []) as PushSubRow[]) {
    const arr = subByUser.get(s.usuario_id) ?? [];
    arr.push(s);
    subByUser.set(s.usuario_id, arr);
  }

  const delivered = new Set<string>();
  for (const d of (deliveries ?? []) as PushDeliveryRow[]) {
    if (d.status === "success") delivered.add(`${d.notificacao_id}:${d.subscription_id}`);
  }

  let sent = 0;
  let failed = 0;
  for (const n of list) {
    const userSubs = subByUser.get(n.usuario_id) ?? [];
    if (!userSubs.length) continue;
    const payload = buildNotificationPayload(n);
    for (const s of userSubs) {
      const key = `${n.id}:${s.id}`;
      if (delivered.has(key)) continue;
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          },
          payload
        );
        sent += 1;
        await admin.from("push_entregas_notificacao").upsert(
          {
            notificacao_id: n.id,
            subscription_id: s.id,
            status: "success",
            tentativas: 1,
            ultimo_erro: null,
            enviado_em: new Date().toISOString(),
          },
          { onConflict: "notificacao_id,subscription_id" }
        );
      } catch (err) {
        failed += 1;
        const msg = err instanceof Error ? err.message.slice(0, 600) : "Falha no envio push.";
        await admin.from("push_entregas_notificacao").upsert(
          {
            notificacao_id: n.id,
            subscription_id: s.id,
            status: "failed",
            tentativas: 1,
            ultimo_erro: msg,
            enviado_em: null,
          },
          { onConflict: "notificacao_id,subscription_id" }
        );
        if (msg.includes("410") || msg.includes("404")) {
          await admin.from("push_subscriptions").update({ ativo: false }).eq("id", s.id);
        }
      }
    }
  }

  return { sent, failed, scanned: list.length };
}

