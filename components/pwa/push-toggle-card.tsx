"use client";

import { useEffect, useMemo, useState } from "react";
import {
  disablePushNotifications,
  enablePushNotifications,
  hasActivePushSubscription,
} from "@/lib/pwa/push-client";

export function PushToggleCard({ defaultEnabled = true }: { defaultEnabled?: boolean }) {
  const vapidPublicKey = useMemo(() => String(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "").trim(), []);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    async function bootstrap() {
      const hasSub = await hasActivePushSubscription();
      if (!active) return;
      setEnabled(hasSub);

      if (!hasSub && defaultEnabled) {
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
    <section className="eid-surface-panel rounded-2xl p-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <h2 className="text-sm font-black uppercase tracking-[0.14em] text-eid-primary-300">Notificação push</h2>
          <p className="mt-0.5 text-[11px] text-eid-text-secondary">
            Status:{" "}
            <span className={enabled ? "font-bold text-eid-action-300" : "font-bold text-eid-text-secondary"}>
              {enabled ? "Ativado" : "Desativado"}
            </span>
          </p>
        </div>
        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md border border-[color:var(--eid-border-subtle)] text-eid-text-secondary transition ${open ? "rotate-180" : ""}`}>
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
            <path d="M5.23 7.21a.75.75 0 011.06.02L10 11.18l3.71-3.95a.75.75 0 111.1 1.02l-4.25 4.53a.75.75 0 01-1.1 0L5.21 8.27a.75.75 0 01.02-1.06z" />
          </svg>
        </span>
      </button>

      {open ? (
        <div className="mt-3">
          <p className="text-xs text-eid-text-secondary">Receba alertas de pedidos, agenda e resultados.</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onToggle}
              disabled={busy}
              className={`rounded-xl px-4 py-2 text-xs font-black ${
                enabled
                  ? "border border-eid-action-500/40 bg-eid-action-500/12 text-eid-action-300"
                  : "border border-[color:var(--eid-border-subtle)] text-eid-fg"
              }`}
            >
              {busy ? "Processando..." : enabled ? "Desativar" : "Ativar"}
            </button>
          </div>
          {msg ? <p className="mt-2 text-[11px] text-eid-primary-300">{msg}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
