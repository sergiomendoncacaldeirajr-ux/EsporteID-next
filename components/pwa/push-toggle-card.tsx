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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-black uppercase tracking-[0.14em] text-eid-primary-300">Notificação push</h2>
          <p className="mt-1 text-xs text-eid-text-secondary">Receba alertas de pedidos, agenda e resultados.</p>
        </div>
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
      <p className="mt-2 text-[11px] text-eid-text-secondary">
        Status atual: <span className={enabled ? "font-bold text-eid-action-300" : "font-bold text-eid-text-secondary"}>{enabled ? "Ativado" : "Desativado"}</span>
      </p>
      {msg ? <p className="mt-1 text-[11px] text-eid-primary-300">{msg}</p> : null}
    </section>
  );
}
