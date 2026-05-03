import { dispatchPushForNotificationIds, isPushDispatchConfigured } from "@/lib/pwa/push-dispatch";
import { createServiceRoleClient, hasServiceRoleConfig } from "@/lib/supabase/service-role";

type PushTriggerMeta = {
  source?: string;
};

export async function triggerPushForNotificationIdsBestEffort(ids: number[], meta?: PushTriggerMeta) {
  const uniq = [...new Set(ids.filter((v) => Number.isFinite(v) && v > 0).map((v) => Math.floor(v)))];
  if (!uniq.length) return;
  if (!hasServiceRoleConfig()) return;
  if (!isPushDispatchConfigured()) {
    console.warn("[push-imediato] VAPID incompleto — não envia Web Push (notificação in-app pode existir).", { source: String(meta?.source ?? "unknown") });
    return;
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
    });
  } catch (error) {
    console.warn("[push-imediato] falha best-effort", {
      source,
      notificationIds: uniq.length,
      error: error instanceof Error ? error.message : "unknown_error",
    });
    // best-effort: fallback permanece no cron.
  }
}
