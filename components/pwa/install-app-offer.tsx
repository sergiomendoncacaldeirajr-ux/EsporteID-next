"use client";

import { useCallback, useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const IOS_DISMISS_SESSION_KEY = "eid-ios-add-home-dismissed";

function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIOSLike() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iPhoneiPod = /iPhone|iPod/.test(ua);
  const iPadUA = /iPad/.test(ua);
  const iPadOS13Plus = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return iPhoneiPod || iPadUA || iPadOS13Plus;
}

function IconShareIOS({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 3v10" strokeLinecap="round" />
      <path d="M8 7l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="5" y="13" width="14" height="8" rx="2" />
    </svg>
  );
}

function IconPlusSquare({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M12 8v8M8 12h8" strokeLinecap="round" />
    </svg>
  );
}

export function InstallAppOffer() {
  const [installEvt, setInstallEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [androidOpen, setAndroidOpen] = useState(false);
  const [iosOpen, setIosOpen] = useState(false);
  const [iosDismissed, setIosDismissed] = useState(false);

  const openIosPanel = useCallback(() => {
    setIosOpen(true);
  }, []);

  const closeIosPanel = useCallback(() => {
    setIosOpen(false);
    try {
      sessionStorage.setItem(IOS_DISMISS_SESSION_KEY, "1");
    } catch {
      /* ignore */
    }
    setIosDismissed(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandaloneMode()) return;

    let dismissed = false;
    try {
      dismissed = sessionStorage.getItem(IOS_DISMISS_SESSION_KEY) === "1";
    } catch {
      dismissed = false;
    }
    if (dismissed) setIosDismissed(true);

    const onBeforeInstallPrompt = (ev: Event) => {
      ev.preventDefault();
      setInstallEvt(ev as BeforeInstallPromptEvent);
      setAndroidOpen(true);
    };

    const onAppInstalled = () => {
      setAndroidOpen(false);
      setInstallEvt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    /* iOS não dispara beforeinstallprompt: oferecemos instruções após um breve delay */
    let t: ReturnType<typeof window.setTimeout> | undefined;
    if (isIOSLike() && !dismissed) {
      t = window.setTimeout(() => setIosOpen(true), 900);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
      if (t !== undefined) window.clearTimeout(t);
    };
  }, []);

  async function onInstallNow() {
    if (!installEvt) return;
    await installEvt.prompt();
    const choice = await installEvt.userChoice;
    if (choice.outcome === "accepted") {
      setAndroidOpen(false);
      setInstallEvt(null);
    }
  }

  const showAndroidModal = androidOpen && Boolean(installEvt);
  const showIosModal = iosOpen && isIOSLike() && !isStandaloneMode();

  return (
    <>
      {showAndroidModal ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/45 p-3 sm:items-center">
          <div className="eid-surface-panel relative w-full max-w-md rounded-3xl border border-eid-primary-500/25 bg-gradient-to-br from-eid-card via-eid-card to-eid-primary-500/[0.14] p-5 shadow-2xl shadow-black/40">
            <button
              type="button"
              onClick={() => setAndroidOpen(false)}
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
      ) : null}

      {showIosModal ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/45 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:items-center">
          <div className="eid-surface-panel relative w-full max-w-md rounded-3xl border border-eid-primary-500/25 bg-gradient-to-br from-eid-card via-eid-card to-eid-primary-500/[0.14] p-5 shadow-2xl shadow-black/40">
            <button
              type="button"
              onClick={closeIosPanel}
              className="absolute right-3 top-3 rounded-lg border border-[color:var(--eid-border-subtle)] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-eid-text-secondary"
            >
              Fechar
            </button>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-eid-primary-300">iPhone e iPad</p>
            <h2 className="mt-2 text-xl font-black text-eid-fg">Adicione o EsporteID à tela inicial</h2>
            <p className="mt-2 text-sm text-eid-text-secondary">
              No Safari, use o menu de compartilhar e depois procure a opção de instalar na Home — o iOS pode mostrar o nome em{" "}
              <strong className="text-eid-fg">português</strong> ou em <strong className="text-eid-fg">inglês</strong>, conforme o idioma do aparelho.
            </p>
            <ol className="mt-4 space-y-3 text-sm text-eid-fg">
              <li className="flex gap-3 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 p-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-eid-primary-500/30 bg-eid-primary-500/12 text-eid-primary-300">
                  <IconShareIOS className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-eid-text-secondary">Passo 1</p>
                  <p className="mt-0.5 font-semibold leading-snug">
                    Toque em <span className="text-eid-primary-300">Compartilhar</span>{" "}
                    <span className="text-eid-text-secondary">(Share)</span>
                  </p>
                  <p className="mt-1 text-xs text-eid-text-secondary">
                    Ícone de quadrado com seta para cima, na barra inferior do Safari.
                  </p>
                </div>
              </li>
              <li className="flex gap-3 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 p-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-eid-action-500/30 bg-eid-action-500/10 text-eid-action-400">
                  <IconPlusSquare className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-eid-text-secondary">Passo 2</p>
                  <p className="mt-0.5 font-semibold leading-snug">
                    Role e escolha{" "}
                    <span className="text-eid-action-400">Adicionar à Tela de Início</span>{" "}
                    <span className="text-eid-text-secondary">ou</span> <span className="text-eid-action-400">Add to Home Screen</span>
                  </p>
                  <p className="mt-1 text-xs text-eid-text-secondary">
                    Confirme com <strong className="text-eid-fg">Adicionar</strong> <span className="text-eid-text-secondary">(Add)</span>. O ícone
                    aparecerá na sua Home.
                  </p>
                </div>
              </li>
            </ol>
            <p className="mt-3 text-[11px] leading-relaxed text-eid-text-secondary">
              Dica: use o <strong className="text-eid-fg">Safari</strong>. Em outros navegadores no iOS o caminho é parecido: procure{" "}
              <strong className="text-eid-fg">Compartilhar / Share</strong> e depois a opção de adicionar à tela inicial.
            </p>
          </div>
        </div>
      ) : null}

      {/* Atalho flutuante no iOS após fechar o painel (nova sessão = painel de novo) */}
      {isIOSLike() && !isStandaloneMode() && iosDismissed && !showIosModal && !showAndroidModal ? (
        <button
          type="button"
          onClick={openIosPanel}
          aria-label="Adicionar à tela inicial — Add to Home Screen"
          title="Adicionar à tela inicial (Add to Home Screen)"
          className="fixed left-1/2 z-[85] min-h-[52px] w-[min(calc(100vw-2rem),20rem)] -translate-x-1/2 rounded-full border border-eid-primary-500/35 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_94%,transparent),color-mix(in_srgb,var(--eid-surface)_92%,transparent))] px-4 py-2.5 text-xs font-black text-eid-primary-200 shadow-[0_12px_28px_-8px_rgba(0,0,0,0.45)] backdrop-blur-md sm:left-auto sm:right-4 sm:w-auto sm:translate-x-0"
          style={{
            bottom: "max(1rem, calc(env(safe-area-inset-bottom, 0px) + var(--eid-shell-footer-offset, 0px) + 0.35rem))",
          }}
        >
          <span className="block leading-tight">Adicionar à tela inicial</span>
          <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-wide text-eid-text-secondary">Add to Home Screen</span>
        </button>
      ) : null}
    </>
  );
}
