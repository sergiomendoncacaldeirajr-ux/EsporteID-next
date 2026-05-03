import {
  dispatchPushForNotificationIds,
  isPushDispatchConfigured,
  type DispatchAggregate,
} from "@/lib/pwa/push-dispatch";
import { createServiceRoleClient, hasServiceRoleConfig } from "@/lib/supabase/service-role";

type PushTriggerMeta = {
  source?: string;
};

export type PushBestEffortResult = DispatchAggregate & {
  /** `false` quando não chegou a concluir o envio ao FCM (sem service role, VAPID incompleto, exceção, etc.). */
  dispatchAttempted: boolean;
  skipReason: null | "no_ids" | "no_service_role" | "vapid_incomplete" | "dispatch_threw";
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
    const result = await dispatchPushForNotificationIds(admin, uniq);
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
    console.warn("[push-imediato] falha best-effort", {
      source,
      notificationIds: uniq.length,
      error: msg,
    });
    return {
      sent: 0,
      failed: 0,
      scanned: uniq.length,
      noDevice: 0,
      dispatchAttempted: false,
      skipReason: "dispatch_threw",
      dispatchError: msg.slice(0, 400),
    };
  }
}
