import { dispatchPushForNotificationIds } from "@/lib/pwa/push-dispatch";
import { createServiceRoleClient, hasServiceRoleConfig } from "@/lib/supabase/service-role";

export async function triggerPushForNotificationIdsBestEffort(ids: number[]) {
  const uniq = [...new Set(ids.filter((v) => Number.isFinite(v) && v > 0).map((v) => Math.floor(v)))];
  if (!uniq.length) return;
  if (!hasServiceRoleConfig()) return;
  try {
    const admin = createServiceRoleClient();
    await dispatchPushForNotificationIds(admin, uniq);
  } catch {
    // best-effort: fallback permanece no cron.
  }
}
