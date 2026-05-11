import {
  dispatchPushForNotificationIds,
  isPushDispatchConfigured,
  type DispatchAggregate,
} from "@/lib/pwa/push-dispatch";
import { createServiceRoleClient, hasServiceRoleConfig } from "@/lib/supabase/service-role";

type PushTriggerMeta = {
  source?: string;
};

/** Não bloquear Server Actions por muito tempo: `webpush.sendNotification` pode demorar vários segundos com endpoint ruim. */
const PUSH_DISPATCH_WAIT_MS = 9_000;

function raceWithTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("push_dispatch_wait_timeout")), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

export type PushBestEffortResult = DispatchAggregate & {
  /** `false` quando não chegou a concluir o envio ao FCM (sem service role, VAPID incompleto, exceção, etc.). */
  dispatchAttempted: boolean;
  skipReason:
    | null
    | "no_ids"
    | "no_service_role"
    | "vapid_incomplete"
    | "dispatch_threw"
    | "dispatch_timeout";
  /** Preenchido quando `skipReason === "dispatch_threw"` (mensagem curta para diagnóstico). */
  dispatchError?: string;
};

export async function triggerPushForNotificationIdsBestEffort(
  ids: number[],
  meta?: PushTriggerMeta
): Promise<PushBestEffortResult> {
  const uniq = [...new Set(ids.filter((v) => Number.isFinite(v) && v > 0).map((v) => Math.floor(v)))];
  if (!uniq.length) {
    return {
      sent: 0,
      failed: 0,
      scanned: 0,
      noDevice: 0,
      dispatchAttempted: false,
      skipReason: "no_ids",
    };
  }
  if (!hasServiceRoleConfig()) {
    return {
      sent: 0,
      failed: 0,
      scanned: uniq.length,
      noDevice: 0,
      dispatchAttempted: false,
      skipReason: "no_service_role",
    };
  }
  if (!isPushDispatchConfigured()) {
    console.warn("[push-imediato] VAPID incompleto — não envia Web Push (notificação in-app pode existir).", {
      source: String(meta?.source ?? "unknown"),
    });
    return {
      sent: 0,
      failed: 0,
      scanned: uniq.length,
      noDevice: 0,
      dispatchAttempted: false,
      skipReason: "vapid_incomplete",
    };
  }
  const source = String(meta?.source ?? "unknown");
  try {
    const admin = createServiceRoleClient();
    const result = await raceWithTimeout(dispatchPushForNotificationIds(admin, uniq), PUSH_DISPATCH_WAIT_MS);
    console.info("[push-imediato]", {
      source,
      notificationIds: uniq.length,
      scanned: result.scanned,
      sent: result.sent,
      failed: result.failed,
      noDevice: result.noDevice,
    });
    return {
      ...result,
      dispatchAttempted: true,
      skipReason: null,
    };
  } catch (error) {
    const msg =
      error instanceof Error
        ? error.message
        : error && typeof error === "object" && "body" in error
          ? String((error as { body?: string }).body ?? error)
          : String(error);
    const isWaitTimeout = error instanceof Error && error.message === "push_dispatch_wait_timeout";
    console.warn(isWaitTimeout ? "[push-imediato] tempo máximo de espera excedido (resposta ao usuário não bloqueada)" : "[push-imediato] falha best-effort", {
      source,
      notificationIds: uniq.length,
      error: msg,
    });
    return {
      sent: 0,
      failed: 0,
      scanned: uniq.length,
      noDevice: 0,
      dispatchAttempted: isWaitTimeout,
      skipReason: isWaitTimeout ? "dispatch_timeout" : "dispatch_threw",
      dispatchError: isWaitTimeout ? undefined : msg.slice(0, 400),
    };
  }
}
