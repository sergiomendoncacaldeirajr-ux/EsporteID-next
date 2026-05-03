"use client";

import { useEffect, useMemo, useState } from "react";
import {
  disablePushNotifications,
  enablePushNotifications,
  getPushClientOptOut,
  hasActivePushSubscription,
} from "@/lib/pwa/push-client";

export function PushToggleCard({ defaultEnabled = true }: { defaultEnabled?: boolean }) {
  const vapidPublicKey = useMemo(() => String(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "").trim(), []);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function bootstrap() {
      const hasSub = await hasActivePushSubscription();
      if (!active) return;
      setEnabled(hasSub);

      if (!hasSub && defaultEnabled && !getPushClientOptOut()) {
        try {
          setBusy(true);
          await enablePushNotifications(vapidPublicKey);
          if (!active) return;
          setEnabled(true);
          setMsg("Push ativo por padrão. Você pode desativar quando quiser.");
        } catch {
          if (!active) return;
          setMsg("Toque em ativar para concluir o push neste navegador.");
        } finally {
          if (active) setBusy(false);
        }
      }
    }
    void bootstrap();
    return () => {
      active = false;
    };
  }, [defaultEnabled, vapidPublicKey]);

  async function onToggle() {
    try {
      setBusy(true);
      setMsg(null);
      if (enabled) {
        await disablePushNotifications();
        setEnabled(false);
        setMsg("Push desativado.");
      } else {
        await enablePushNotifications(vapidPublicKey);
        setEnabled(true);
        setMsg("Push ativado.");
      }
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Não foi possível alterar o push.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="eid-surface-panel rounded-2xl px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/60 text-eid-primary-400">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
              <path d="M18 9a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M13.73 21a2 2 0 01-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-[11px] font-black text-eid-primary-400">Notificação push</h2>
            <p className="mt-0.5 text-[10px] leading-none text-eid-text-secondary">
              Status:{" "}
              <span className={enabled ? "font-bold text-eid-action-400" : "font-bold text-eid-text-secondary"}>
                {enabled ? "Ativado" : "Desativado"}
              </span>
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onToggle}
          disabled={busy}
          aria-label={enabled ? "Desativar notificação push" : "Ativar notificação push"}
          className={`relative inline-flex h-6 w-10 shrink-0 items-center rounded-full border p-0 transition ${
            enabled
              ? "border-eid-primary-500/45 bg-eid-primary-500/90"
              : "border-[color:var(--eid-border-subtle)] bg-eid-surface/70"
          } ${busy ? "opacity-70" : ""}`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
              enabled ? "translate-x-[20px]" : "translate-x-[3px]"
            }`}
          />
        </button>
      </div>
      {msg ? <p className="mt-1 text-[10px] text-eid-primary-300">{msg}</p> : null}
    </section>
  );
}
