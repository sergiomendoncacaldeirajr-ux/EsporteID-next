"use client";

import { useEffect, useMemo, useState } from "react";
import {
  enablePushNotifications,
  isNativeAndroidApp,
  isStandaloneAndroidApp,
  setAndroidNativePushEnabled,
} from "@/lib/pwa/push-client";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const PLAY_STORE_INSTALL_URL = "https://play.google.com/store/apps/details?id=com.esporteid.app";

function isAndroidBrowser() {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent || "") && !isNativeAndroidApp();
}

export function PwaQuickActions() {
  const [installEvt, setInstallEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installReady, setInstallReady] = useState(false);
  const [showPlayInstall, setShowPlayInstall] = useState(false);
  const [pushStatus, setPushStatus] = useState<"idle" | "enabling" | "enabled" | "error">("idle");
  const [pushMsg, setPushMsg] = useState<string | null>(null);

  const vapidPublicKey = useMemo(() => String(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "").trim(), []);

  useEffect(() => {
    if (isNativeAndroidApp()) return;
    setShowPlayInstall(isAndroidBrowser());
    const onBeforeInstallPrompt = (ev: Event) => {
      ev.preventDefault();
      if (isAndroidBrowser()) return;
      setInstallEvt(ev as BeforeInstallPromptEvent);
      setInstallReady(true);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  async function onInstall() {
    if (!installEvt) return;
    await installEvt.prompt();
    const choice = await installEvt.userChoice;
    if (choice.outcome === "accepted") {
      setInstallReady(false);
      setInstallEvt(null);
    }
  }

  async function onEnablePush() {
    try {
      setPushStatus("enabling");
      setPushMsg(null);
      if (!("Notification" in window) || !("serviceWorker" in navigator)) {
        setPushStatus("error");
        setPushMsg("Seu navegador não suporta notificações push.");
        return;
      }
      if (isStandaloneAndroidApp()) {
        await setAndroidNativePushEnabled(true);
        setPushStatus("enabled");
        setPushMsg("Notificações ativadas.");
        return;
      }
      if (!vapidPublicKey) {
        setPushStatus("error");
        setPushMsg("Não foi possível ativar as notificações agora.");
        return;
      }
      await enablePushNotifications(vapidPublicKey);
      setPushStatus("enabled");
      setPushMsg("Notificações ativadas.");
    } catch (err) {
      setPushStatus("error");
      setPushMsg(err instanceof Error ? err.message : "Não foi possível ativar o push.");
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {isNativeAndroidApp() ? null : showPlayInstall ? (
        <a
          href={PLAY_STORE_INSTALL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-eid-action-500/35 bg-eid-action-500/10 px-3 py-1.5 text-[11px] font-bold text-eid-action-300"
        >
          Instalar pela Play Store
        </a>
      ) : (
        <button
          type="button"
          onClick={onInstall}
          disabled={!installReady}
          className={`rounded-lg px-3 py-1.5 text-[11px] font-bold ${
            installReady
              ? "border border-eid-primary-500/35 bg-eid-primary-500/10 text-eid-primary-300"
              : "cursor-not-allowed border border-[color:var(--eid-border-subtle)] text-eid-text-secondary/70"
          }`}
        >
          Instalar
        </button>
      )}
      <button
        type="button"
        onClick={onEnablePush}
        disabled={pushStatus === "enabling" || pushStatus === "enabled"}
        className={`rounded-lg px-3 py-1.5 text-[11px] font-bold ${
          pushStatus === "enabled"
            ? "border border-eid-action-500/35 bg-eid-action-500/10 text-eid-action-300"
            : "border border-[color:var(--eid-border-subtle)] text-eid-fg"
        }`}
      >
        {pushStatus === "enabling" ? "Ativando..." : pushStatus === "enabled" ? "Push ativo" : "Ativar push"}
      </button>
      {pushMsg ? <p className={`basis-full text-[11px] ${pushStatus === "error" ? "text-red-300" : "text-eid-primary-300"}`}>{pushMsg}</p> : null}
    </div>
  );
}
