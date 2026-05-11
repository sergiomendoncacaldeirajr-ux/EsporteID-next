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

type PushSendError = Error & {
  statusCode?: number;
  body?: string;
};

export type DispatchAggregate = {
  sent: number;
  failed: number;
  scanned: number;
  /** Notificações cujo usuário não tinha nenhuma subscription ativa (nada foi enviado ao FCM). */
  noDevice: number;
};

/** Chaves VAPID no servidor (envio de push). Sem isso, `flush-user` não deve retornar 500 em dev. */
export function isPushDispatchConfigured(): boolean {
  const publicKey = String(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "").trim();
  const privateKey = String(process.env.VAPID_PRIVATE_KEY ?? "").trim();
  return Boolean(publicKey && privateKey);
}

function normalizePushConfig() {
  const publicKey = String(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "").trim();
  const privateKey = String(process.env.VAPID_PRIVATE_KEY ?? "").trim();
  const subject = String(process.env.VAPID_SUBJECT ?? "mailto:suporte@esporteid.com").trim();
  if (!publicKey || !privateKey) {
    throw new Error("VAPID não configurado. Defina NEXT_PUBLIC_VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY.");
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "23505";
}

function isSendingStale(updatedAt: string | null | undefined): boolean {
  if (!updatedAt) return true;
  const t = new Date(updatedAt).getTime();
  if (!Number.isFinite(t)) return true;
  return Date.now() - t > 10 * 60 * 1000;
}

/**
 * Garante que só um worker envia push para o par (notificação, subscription).
 * Duas requisições paralelas (ex.: sininho + rodapé, ou webhook + flush) não devem
 * passar ambas pelo envio antes de existir linha em `push_entregas_notificacao`.
 */
async function claimPushDeliveryRow(
  admin: SupabaseClient,
  notificacaoId: number,
  subscriptionId: number
): Promise<boolean> {
  const { error: insErr } = await admin.from("push_entregas_notificacao").insert({
    notificacao_id: notificacaoId,
    subscription_id: subscriptionId,
    status: "sending",
    tentativas: 0,
    ultimo_erro: null,
    enviado_em: null,
  });
  if (!insErr) return true;
  if (!isUniqueViolation(insErr)) throw new Error(`Falha ao reservar entrega push: ${insErr.message}`);

  const { data: row, error: selErr } = await admin
    .from("push_entregas_notificacao")
    .select("status, atualizado_em")
    .eq("notificacao_id", notificacaoId)
    .eq("subscription_id", subscriptionId)
    .maybeSingle();
  if (selErr) throw new Error(`Falha ao ler entrega push: ${selErr.message}`);
  const delivery = row as { status?: string; atualizado_em?: string | null } | null;
  const st = String(delivery?.status ?? "").toLowerCase();
  if (st === "success") return false;
  if (st === "sending" && !isSendingStale(delivery?.atualizado_em)) return false;

  const { data: claimed, error: updErr } = await admin
    .from("push_entregas_notificacao")
    .update({ status: "sending", ultimo_erro: null })
    .eq("notificacao_id", notificacaoId)
    .eq("subscription_id", subscriptionId)
    .in("status", ["failed", "pendente", "sending"])
    .select("id");
  if (updErr) throw new Error(`Falha ao re-reservar entrega push: ${updErr.message}`);
  return (claimed ?? []).length > 0;
}

function buildNotificationPayload(n: NotificacaoRow): string {
  const tipo = String(n.tipo ?? "").toLowerCase().trim();
  const rawMsg = String(n.mensagem ?? "").trim();
  const body = rawMsg.length > 110 ? rawMsg.slice(0, 107) + "…" : rawMsg || "Você tem uma nova notificação.";

  let title: string;
  let url: string;
  let requireInteraction = false;
  let category: string = tipo;

  if (tipo === "match") {
    title = "⚔️ EsporteID · Desafio recebido";
    url = "/comunidade#desafios";
    requireInteraction = true;
  } else if (tipo === "desafio") {
    title = "🏆 EsporteID · Placar / Agenda";
    url = "/agenda#placares";
    requireInteraction = true;
  } else if (tipo === "agenda_status") {
    title = "📅 EsporteID · Atualização de agenda";
    url = "/agenda#agenda-status-ranking";
  } else if (tipo.includes("candidatura")) {
    title = "👥 EsporteID · Candidatura";
    url = "/comunidade";
    requireInteraction = true;
  } else if (tipo.includes("convite")) {
    title = "👥 EsporteID · Convite de equipe";
    url = "/comunidade";
    requireInteraction = true;
  } else if (tipo.includes("time")) {
    title = "👥 EsporteID · Equipe";
    url = "/comunidade";
  } else if (tipo.includes("professor")) {
    title = "📚 EsporteID · Aulas";
    url = "/comunidade#aulas";
  } else {
    title = "EsporteID";
    url = "/comunidade#notificacoes";
    category = "geral";
  }

  return JSON.stringify({
    title,
    body,
    url,
    tag: `notif-${n.id}`,
    tipo: category,
    requireInteraction,
  });
}

async function dispatchNotificationsToSubscriptions(
  admin: SupabaseClient,
  list: NotificacaoRow[]
): Promise<DispatchAggregate> {
  if (!list.length) return { sent: 0, failed: 0, scanned: 0, noDevice: 0 };

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
  let noDevice = 0;
  const sendOpts = { TTL: 86_400, urgency: "high" as const };
  for (const n of list) {
    const userSubs = subByUser.get(n.usuario_id) ?? [];
    if (!userSubs.length) {
      noDevice += 1;
      continue;
    }
    const payload = buildNotificationPayload(n);
    for (const s of userSubs) {
      const key = `${n.id}:${s.id}`;
      if (delivered.has(key)) continue;
      const claimed = await claimPushDeliveryRow(admin, n.id, s.id);
      if (!claimed) continue;
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          },
          payload,
          sendOpts
        );
        sent += 1;
        delivered.add(key);
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
        const pushErr = err as PushSendError;
        const statusCode = Number(pushErr?.statusCode ?? 0);
        const msg =
          err instanceof Error
            ? `${statusCode ? `${statusCode} ` : ""}${err.message}`.slice(0, 600)
            : "Falha no envio push.";
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
        if ([400, 403, 404, 410].includes(statusCode) || /\b(400|403|404|410)\b/.test(msg)) {
          await admin.from("push_subscriptions").update({ ativo: false }).eq("id", s.id);
        }
      }
    }
  }

  return { sent, failed, scanned: list.length, noDevice };
}

export async function dispatchPendingPushNotifications(
  admin: SupabaseClient,
  opts?: { batchSize?: number }
): Promise<DispatchAggregate> {
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
  return dispatchNotificationsToSubscriptions(admin, list);
}

export async function dispatchPushForNotificationIds(
  admin: SupabaseClient,
  notificationIds: number[]
): Promise<DispatchAggregate> {
  normalizePushConfig();
  const ids = [...new Set(notificationIds.filter((v) => Number.isFinite(v) && v > 0).map((v) => Math.floor(v)))];
  if (!ids.length) return { sent: 0, failed: 0, scanned: 0, noDevice: 0 };
  const { data: notificacoes, error: notifErr } = await admin
    .from("notificacoes")
    .select("id, usuario_id, mensagem, tipo, referencia_id")
    .in("id", ids);
  if (notifErr) throw new Error(`Falha ao buscar notificações por id: ${notifErr.message}`);
  const list = (notificacoes ?? []) as NotificacaoRow[];
  return dispatchNotificationsToSubscriptions(admin, list);
}

