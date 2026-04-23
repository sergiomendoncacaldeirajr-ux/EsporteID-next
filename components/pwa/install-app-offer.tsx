"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isStandaloneMode() {
  return window.matchMedia("(display-mode: standalone)").matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function InstallAppOffer() {
  const [installEvt, setInstallEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandaloneMode()) return;

    const onBeforeInstallPrompt = (ev: Event) => {
      ev.preventDefault();
      setInstallEvt(ev as BeforeInstallPromptEvent);
      setOpen(true);
    };

    const onAppInstalled = () => {
      setOpen(false);
      setInstallEvt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  async function onInstallNow() {
    if (!installEvt) return;
    await installEvt.prompt();
    const choice = await installEvt.userChoice;
    if (choice.outcome === "accepted") {
      setOpen(false);
      setInstallEvt(null);
    }
  }

  if (!open || !installEvt) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/45 p-3 sm:items-center">
      <div className="eid-surface-panel relative w-full max-w-md rounded-3xl border border-eid-primary-500/25 bg-gradient-to-br from-eid-card via-eid-card to-eid-primary-500/[0.14] p-5 shadow-2xl shadow-black/40">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute right-3 top-3 rounded-lg border border-[color:var(--eid-border-subtle)] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-eid-text-secondary"
        >
          Fechar
        </button>
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-eid-primary-300">Aplicativo EsporteID</p>
        <h2 className="mt-2 text-xl font-black text-eid-fg">Instale o app para uma experiência completa</h2>
        <p className="mt-2 text-sm text-eid-text-secondary">
          Acesso rápido, visual de app no celular e melhor entrega de notificações importantes.
        </p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onInstallNow}
            className="eid-btn-primary min-h-[44px] flex-1 rounded-xl px-4 text-sm font-black"
          >
            Instalar agora
          </button>
        </div>
      </div>
    </div>
  );
}
