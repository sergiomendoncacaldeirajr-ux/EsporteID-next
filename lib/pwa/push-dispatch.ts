import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isFcmConfigured, sendFcmMessage } from "@/lib/push/fcm-rest";

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
  atualizado_em: string | null;
  user_agent: string | null;
};

type PushDeliveryRow = {
  notificacao_id: number;
  subscription_id: number;
  status: string;
};

type NativeFcmTokenRow = {
  id: number;
  usuario_id: string;
  token: string;
  platform?: string | null;
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

function newerSubscriptionFirst(a: PushSubRow, b: PushSubRow): number {
  const ta = a.atualizado_em ? new Date(a.atualizado_em).getTime() : 0;
  const tb = b.atualizado_em ? new Date(b.atualizado_em).getTime() : 0;
  return tb - ta;
}

function inferPushPlatform(userAgent: string | null | undefined) {
  const ua = String(userAgent ?? "");
  if (/Android/i.test(ua) && /EsporteIDPush\/.*display=standalone/i.test(ua)) return "Android/App";
  if (/Android/i.test(ua)) return "Android/Navegador";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  if (/Windows/i.test(ua)) return "Windows/PC";
  if (/Macintosh|Mac OS X/i.test(ua)) return "macOS";
  return "Outro";
}

function isDeliveredPushStatus(status: string | null | undefined) {
  return ["success", "received", "shown"].includes(String(status ?? "").toLowerCase());
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(label)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
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

function buildNotificationPayload(n: NotificacaoRow, platform = "Outro"): string {
  const tipo = String(n.tipo ?? "").toLowerCase().trim();
  const rawMsg = String(n.mensagem ?? "").trim();
  const body = rawMsg.length > 110 ? rawMsg.slice(0, 107) + "…" : rawMsg || "Você tem uma nova notificação.";
  const isAndroid = platform.startsWith("Android/");

  let title: string;
  let url: string;
  let requireInteraction = false;
  let category: string = tipo;
  let actionLabel = "Abrir";

  if (tipo === "match") {
    title = isAndroid ? "EsporteID - Desafio recebido" : "⚔️ EsporteID · Desafio recebido";
    url = "/comunidade#desafios";
    requireInteraction = true;
    actionLabel = "Ver desafio";
  } else if (tipo === "desafio") {
    title = isAndroid ? "EsporteID - Placar / Agenda" : "🏆 EsporteID · Placar / Agenda";
    url = "/agenda#placares";
    requireInteraction = true;
    actionLabel = "Ver agenda";
  } else if (tipo === "agenda_status") {
    title = isAndroid ? "EsporteID - Atualização de agenda" : "📅 EsporteID · Atualização de agenda";
    url = "/agenda#agenda-status-ranking";
    actionLabel = "Ver agenda";
  } else if (tipo.includes("candidatura")) {
    title = isAndroid ? "EsporteID - Candidatura" : "👥 EsporteID · Candidatura";
    url = "/comunidade";
    requireInteraction = true;
    actionLabel = "Responder";
  } else if (tipo.includes("convite")) {
    title = isAndroid ? "EsporteID - Convite de equipe" : "👥 EsporteID · Convite de equipe";
    url = "/comunidade";
    requireInteraction = true;
    actionLabel = "Responder";
  } else if (tipo.includes("time")) {
    title = isAndroid ? "EsporteID - Equipe" : "👥 EsporteID · Equipe";
    url = "/comunidade";
    actionLabel = "Ver equipe";
  } else if (tipo.includes("professor")) {
    title = isAndroid ? "EsporteID - Aulas" : "📚 EsporteID · Aulas";
    url = "/comunidade#aulas";
    actionLabel = "Ver aulas";
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
    notifId: n.id,
    tipo: category,
    actionLabel,
    referenceId: n.referencia_id,
    requireInteraction: isAndroid ? false : requireInteraction,
    platform,
  });
}

function androidChannelIdForPushTipo(tipo: string | null | undefined) {
  const t = String(tipo ?? "").toLowerCase().trim();
  if (t === "match" || t.includes("desafio")) return "eid_desafios";
  if (t === "agenda_status" || t.includes("agenda") || t.includes("placar")) return "eid_agenda";
  if (t.includes("ranking") || t.includes("resultado")) return "eid_ranking";
  if (t.includes("candidatura") || t.includes("convite") || t.includes("time") || t.includes("professor")) {
    return "eid_social";
  }
  return "eid_geral";
}

function buildFcmMessage(n: NotificacaoRow, token: string, platform: "android" | "ios") {
  const payload = JSON.parse(buildNotificationPayload(n, platform === "ios" ? "iOS/App" : "Android/App")) as {
    title?: string;
    body?: string;
    url?: string;
    notifId?: number;
    tipo?: string;
    actionLabel?: string;
    referenceId?: number | null;
  };

  return {
    token,
    notification: {
      title: String(payload.title || "EsporteID"),
      body: String(payload.body || "Voce tem uma nova notificacao."),
    },
    data: {
      title: String(payload.title || "EsporteID"),
      body: String(payload.body || "Voce tem uma nova notificacao."),
      url: String(payload.url || "/comunidade#notificacoes"),
      notifId: String(payload.notifId || n.id),
      tipo: String(payload.tipo || n.tipo || "geral"),
      actionLabel: String(payload.actionLabel || "Abrir"),
      referenceId: String(payload.referenceId || n.referencia_id || ""),
    },
    android: platform === "android" ? {
      priority: "high" as const,
      notification: {
        channelId: androidChannelIdForPushTipo(payload.tipo || n.tipo),
        icon: "ic_stat_eid_notification",
        color: "#2563EB",
        tag: `notif-${String(payload.notifId || n.id)}`,
      },
    } : undefined,
    apns: platform === "ios" ? {
      headers: {
        "apns-priority": "10",
      },
      payload: {
        aps: {
          sound: "default",
          category: String(payload.tipo || n.tipo || "geral"),
          threadId: `notif-${String(payload.tipo || n.tipo || "geral")}`,
        },
      },
    } : undefined,
  };
}

async function dispatchFcmToNativeApps(
  admin: SupabaseClient,
  list: NotificacaoRow[],
  userIds: string[]
): Promise<{ sent: number; failed: number }> {
  if (!isFcmConfigured()) return { sent: 0, failed: 0 };
  const { data, error } = await admin
    .from("android_fcm_tokens")
    .select("id, usuario_id, token, platform")
    .eq("ativo", true)
    .in("usuario_id", userIds)
    .in("platform", ["android", "ios"]);
  if (error) throw new Error(`Falha ao buscar tokens FCM nativos: ${error.message}`);

  const tokensByUser = new Map<string, NativeFcmTokenRow[]>();
  for (const row of (data ?? []) as NativeFcmTokenRow[]) {
    const arr = tokensByUser.get(row.usuario_id) ?? [];
    arr.push(row);
    tokensByUser.set(row.usuario_id, arr);
  }

  let sent = 0;
  let failed = 0;
  for (const n of list) {
    const rows = tokensByUser.get(n.usuario_id) ?? [];
    const results = await Promise.all(
      rows.map(async (row) => {
        try {
          const platform = String(row.platform ?? "android").trim().toLowerCase() === "ios" ? "ios" : "android";
          await sendFcmMessage(buildFcmMessage(n, row.token, platform));
          return { sent: 1, failed: 0, stale: false };
        } catch (err) {
          const code = String((err as { code?: string })?.code ?? "");
          return { sent: 0, failed: 1, stale: /registration-token-not-registered|invalid-registration-token|UNREGISTERED|NOT_FOUND/.test(code) };
        }
      })
    );
    sent += results.reduce((acc, r) => acc + r.sent, 0);
    failed += results.reduce((acc, r) => acc + r.failed, 0);
    const staleTokens = rows.filter((_, index) => results[index]?.stale).map((row) => row.token);
    if (staleTokens.length) {
      await admin.from("android_fcm_tokens").update({ ativo: false }).in("token", staleTokens);
    }
  }
  return { sent, failed };
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
      .select("id, usuario_id, endpoint, p256dh, auth, atualizado_em, user_agent")
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
    arr.sort(newerSubscriptionFirst);
    subByUser.set(s.usuario_id, arr);
  }
  const delivered = new Set<string>();
  for (const d of (deliveries ?? []) as PushDeliveryRow[]) {
    if (isDeliveredPushStatus(d.status)) delivered.add(`${d.notificacao_id}:${d.subscription_id}`);
  }

  let sent = 0;
  let failed = 0;
  let noDevice = 0;
  const fcmResult = await dispatchFcmToNativeApps(admin, list, userIds);
  sent += fcmResult.sent;
  failed += fcmResult.failed;

  const sendOpts = { TTL: 86_400, urgency: "high" as const };
  for (const n of list) {
    const userSubs = subByUser.get(n.usuario_id) ?? [];
    if (!userSubs.length) {
      noDevice += 1;
      continue;
    }
    const results = await Promise.all(
      userSubs.map(async (s) => {
      const platform = inferPushPlatform(s.user_agent);
      const payload = buildNotificationPayload(n, platform);
      const key = `${n.id}:${s.id}`;
      if (delivered.has(key)) return { sent: 0, failed: 0 };
      const claimed = await claimPushDeliveryRow(admin, n.id, s.id);
      if (!claimed) return { sent: 0, failed: 0 };
      try {
        await withTimeout(
          webpush.sendNotification(
            {
              endpoint: s.endpoint,
              keys: { p256dh: s.p256dh, auth: s.auth },
            },
            payload,
            sendOpts
          ),
          6500,
          "push_endpoint_timeout"
        );
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
        return { sent: 1, failed: 0 };
      } catch (err) {
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
        return { sent: 0, failed: 1 };
      }
      })
    );
    sent += results.reduce((acc, r) => acc + r.sent, 0);
    failed += results.reduce((acc, r) => acc + r.failed, 0);
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

