"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const LOCK_MS = 1400;
const NAV_LOADING_FALLBACK_MS = 30000;
type LoadingCause = "nav" | "submit";
type OnboardingSkeletonStep = "papeis" | "esportes" | "extras" | "perfil";
type AuthSkeletonScreen = "login" | "cadastro" | "recuperar" | "codigo" | "redefinir";

function readOnboardingStepFromDom(): OnboardingSkeletonStep | null {
  const raw = document.querySelector("[data-eid-onboarding-step]")?.getAttribute("data-eid-onboarding-step");
  return raw === "papeis" || raw === "esportes" || raw === "extras" || raw === "perfil" ? raw : null;
}

function readAuthSkeletonScreen(pathname: string | null): AuthSkeletonScreen | null {
  const p = pathname ?? "";
  if (p === "/login") return "login";
  if (p === "/cadastro") return "cadastro";
  if (p === "/recuperar-senha") return "recuperar";
  if (p === "/verificar-codigo") return "codigo";
  if (p === "/redefinir-senha") return "redefinir";
  return null;
}

function AuthExactSkeleton({ screen }: { screen: AuthSkeletonScreen }) {
  return (
    <div className="mx-auto w-full max-w-[340px] pb-6">
      {screen === "login" ? <div className="eid-loading-skeleton-block mb-3 h-4 w-44 rounded-md" /> : null}
      <div className="mb-5 mt-1 flex justify-center">
        <div className="eid-loading-skeleton-block h-12 w-52 rounded-lg" />
      </div>
      <div className="eid-loading-skeleton-block rounded-2xl p-5">
        <div className="eid-loading-skeleton-block mx-auto h-4 w-28 rounded-md" />
        <div className="eid-loading-skeleton-block mx-auto mt-3 h-3 w-[82%] rounded-md" />

        {screen === "login" ? (
          <div className="mt-4 space-y-2">
            <div className="eid-loading-skeleton-block h-[46px] rounded-[14px]" />
            <div className="eid-loading-skeleton-block h-[46px] rounded-[14px]" />
            <div className="eid-loading-skeleton-block mt-2 h-[50px] rounded-xl" />
            <div className="eid-loading-skeleton-block mx-auto mt-4 h-3 w-28 rounded-md" />
            <div className="eid-loading-skeleton-block mx-auto mt-3 h-3 w-32 rounded-md" />
          </div>
        ) : null}

        {screen === "cadastro" ? (
          <div className="mt-4 space-y-2">
            <div className="eid-loading-skeleton-block h-[46px] rounded-[14px]" />
            <div className="eid-loading-skeleton-block h-[46px] rounded-[14px]" />
            <div className="eid-loading-skeleton-block h-[46px] rounded-[14px]" />
            <div className="eid-loading-skeleton-block h-[46px] rounded-[14px]" />
            <div className="eid-loading-skeleton-block mt-2 h-3 w-36 rounded-md" />
            <div className="eid-loading-skeleton-block h-[46px] rounded-[14px]" />
            <div className="eid-loading-skeleton-block mt-2 h-[42px] rounded-xl" />
            <div className="eid-loading-skeleton-block mt-2 h-[50px] rounded-xl" />
            <div className="eid-loading-skeleton-block mx-auto mt-4 h-3 w-32 rounded-md" />
          </div>
        ) : null}

        {screen === "recuperar" ? (
          <div className="mt-4 space-y-3">
            <div className="eid-loading-skeleton-block h-3 w-24 rounded-md" />
            <div className="eid-loading-skeleton-block h-[46px] rounded-xl" />
            <div className="eid-loading-skeleton-block h-[50px] rounded-xl" />
          </div>
        ) : null}

        {screen === "codigo" ? (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-6 gap-2">
              <div className="eid-loading-skeleton-block h-12 rounded-xl" />
              <div className="eid-loading-skeleton-block h-12 rounded-xl" />
              <div className="eid-loading-skeleton-block h-12 rounded-xl" />
              <div className="eid-loading-skeleton-block h-12 rounded-xl" />
              <div className="eid-loading-skeleton-block h-12 rounded-xl" />
              <div className="eid-loading-skeleton-block h-12 rounded-xl" />
            </div>
            <div className="eid-loading-skeleton-block h-[46px] rounded-xl" />
            <div className="eid-loading-skeleton-block mx-auto h-3 w-36 rounded-md" />
          </div>
        ) : null}

        {screen === "redefinir" ? (
          <div className="mt-4 space-y-3">
            <div className="eid-loading-skeleton-block h-3 w-24 rounded-md" />
            <div className="eid-loading-skeleton-block h-[46px] rounded-xl" />
            <div className="eid-loading-skeleton-block h-3 w-36 rounded-md" />
            <div className="eid-loading-skeleton-block h-[46px] rounded-xl" />
            <div className="eid-loading-skeleton-block h-[46px] rounded-xl" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function OnboardingExactSkeleton({ step }: { step: OnboardingSkeletonStep }) {
  return (
    <>
      <div className="mx-auto w-full max-w-2xl pb-6">
        <div className="mb-3 flex items-center gap-x-4 gap-y-2">
          <div className="eid-loading-skeleton-block h-4 w-28 rounded-md opacity-0" />
        </div>
        <div className="mb-5 mt-1 flex justify-center">
          <div className="eid-loading-skeleton-block h-12 w-52 rounded-lg" />
        </div>
        <div className="eid-loading-skeleton-block rounded-2xl p-6 sm:p-8">
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="eid-loading-skeleton-block h-3 w-24 rounded-md" />
              <div className="flex items-center gap-1.5">
                <div className="eid-loading-skeleton-block h-7 w-24 rounded-lg" />
                <div className="eid-loading-skeleton-block h-7 w-20 rounded-lg" />
              </div>
            </div>
            <div className="eid-loading-skeleton-block h-2 w-full rounded-full" />
            <div className="eid-loading-skeleton-block mt-2 h-3 w-44 rounded-md" />
          </div>

          <div className="eid-loading-skeleton-block mx-auto h-3 w-24 rounded-md" />
          <div className="eid-loading-skeleton-block mt-2 h-8 w-44 rounded-lg" />
          <div className="eid-loading-skeleton-block mt-2 h-3 w-[92%] rounded-md" />
          <div className="eid-loading-skeleton-block mt-1 h-3 w-[84%] rounded-md" />

          {step === "papeis" ? (
            <div className="mt-6 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="eid-loading-skeleton-block h-[6.6rem] rounded-2xl" />
                <div className="eid-loading-skeleton-block h-[6.6rem] rounded-2xl" />
                <div className="eid-loading-skeleton-block h-[6.6rem] rounded-2xl" />
                <div className="eid-loading-skeleton-block h-[6.6rem] rounded-2xl" />
              </div>
              <div className="eid-loading-skeleton-block h-[2.6rem] rounded-xl" />
              <div className="eid-loading-skeleton-block h-[3rem] rounded-xl" />
            </div>
          ) : null}

          {step === "esportes" ? (
            <div className="mt-6 space-y-4">
              <div className="flex flex-wrap gap-2">
                <div className="eid-loading-skeleton-block h-8 w-20 rounded-full" />
                <div className="eid-loading-skeleton-block h-8 w-24 rounded-full" />
                <div className="eid-loading-skeleton-block h-8 w-16 rounded-full" />
                <div className="eid-loading-skeleton-block h-8 w-20 rounded-full" />
                <div className="eid-loading-skeleton-block h-8 w-24 rounded-full" />
              </div>
              <div className="space-y-3">
                <div className="eid-loading-skeleton-block h-[17rem] rounded-2xl" />
                <div className="eid-loading-skeleton-block h-[17rem] rounded-2xl" />
              </div>
              <div className="eid-loading-skeleton-block h-[3rem] rounded-xl" />
            </div>
          ) : null}

          {step === "extras" ? (
            <div className="mt-6 space-y-5">
              {/* Fluxo atual (Atleta): etapa extras é mínima antes do perfil */}
              <div className="eid-loading-skeleton-block h-[3.4rem] rounded-xl" />
              <div className="eid-loading-skeleton-block h-[3rem] rounded-xl" />
            </div>
          ) : null}

          {step === "perfil" ? (
            <div className="mt-6 space-y-4">
              <div className="eid-loading-skeleton-block h-[15.8rem] rounded-2xl" />
              <div className="eid-loading-skeleton-block h-[5.4rem] rounded-2xl" />
              <div className="eid-loading-skeleton-block h-[3.1rem] rounded-xl" />
              <div className="eid-loading-skeleton-block h-[3.1rem] rounded-xl" />
              <div className="eid-loading-skeleton-block h-[3.1rem] rounded-xl" />
              <div className="eid-loading-skeleton-block h-[5.2rem] rounded-xl" />
              <div className="eid-loading-skeleton-block h-[3.1rem] rounded-xl" />
              <div className="eid-loading-skeleton-block h-[3.1rem] rounded-xl" />
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

function isSameOriginNavigationLink(el: HTMLAnchorElement) {
  if (!el.href) return false;
  if (el.target && el.target !== "_self") return false;
  if (el.hasAttribute("download")) return false;
  try {
    const url = new URL(el.href, window.location.href);
    return url.origin === window.location.origin && url.href !== window.location.href;
  } catch {
    return false;
  }
}

function isAuthPath(pathname: string | null): boolean {
  const p = pathname ?? "";
  return (
    p === "/login" ||
    p === "/cadastro" ||
    p === "/recuperar-senha" ||
    p === "/redefinir-senha" ||
    p === "/verificar-codigo" ||
    p.startsWith("/auth/")
  );
}

function getLockableClickTarget(target: Element): HTMLElement | null {
  const inputEl = target.closest("input") as HTMLInputElement | null;
  if (inputEl) {
    const t = inputEl.type;
    if (t === "checkbox" || t === "radio" || t === "button" || t === "submit" || t === "image") return inputEl;
  }
  const buttonEl = target.closest("button") as HTMLButtonElement | null;
  if (buttonEl) return buttonEl;
  const roleButtonEl = target.closest('[role="button"]') as HTMLElement | null;
  if (roleButtonEl) return roleButtonEl;
  const labelEl = target.closest("label") as HTMLLabelElement | null;
  if (labelEl) return labelEl;
  return null;
}

/** Não usar disabled=true no capture do clique — o browser cancela o submit do formulário. */
function isFormSubmitControl(el: HTMLElement): boolean {
  if (el instanceof HTMLInputElement) {
    return el.type === "submit" || el.type === "image";
  }
  if (el instanceof HTMLButtonElement) {
    return el.type === "submit";
  }
  return false;
}

function lockElement(el: HTMLElement, opts?: { disableNative?: boolean }) {
  const disableNative = opts?.disableNative ?? true;
  if (el.dataset.eidLocked === "1") return false;
  el.dataset.eidLocked = "1";
  /* Submit: aplica “locked” no próximo frame para não interferir no envio do formulário. */
  if (isFormSubmitControl(el)) {
    requestAnimationFrame(() => el.classList.add("eid-is-locked"));
  } else {
    el.classList.add("eid-is-locked");
  }

  const canDisableNative =
    disableNative &&
    (el instanceof HTMLButtonElement || el instanceof HTMLInputElement) &&
    !isFormSubmitControl(el);

  if (canDisableNative) {
    el.disabled = true;
  } else if (!(el instanceof HTMLButtonElement || el instanceof HTMLInputElement)) {
    el.setAttribute("aria-disabled", "true");
  }

  window.setTimeout(() => {
    el.dataset.eidLocked = "0";
    el.classList.remove("eid-is-locked");
    if (canDisableNative) {
      el.disabled = false;
    } else if (!(el instanceof HTMLButtonElement || el instanceof HTMLInputElement)) {
      el.removeAttribute("aria-disabled");
    }
  }, LOCK_MS);

  return true;
}

export function InteractionFeedback() {
  const pathname = usePathname();
  const authPath = isAuthPath(pathname);
  const isOnboarding = (pathname ?? "").startsWith("/onboarding");
  const authSkeletonScreen = readAuthSkeletonScreen(pathname);
  const isAuthOrOnboarding = authPath || isOnboarding;
  const [loading, setLoading] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [contentTopOffsetPx, setContentTopOffsetPx] = useState(0);
  const [onboardingSkeletonStep, setOnboardingSkeletonStep] = useState<OnboardingSkeletonStep>("papeis");
  const navStartedAtRef = useRef<number>(0);
  const loadingCauseRef = useRef<LoadingCause | null>(null);
  const loadingRef = useRef(false);
  const hideTimerRef = useRef<number | null>(null);
  const navFallbackTimerRef = useRef<number | null>(null);
  const submitMutationObserverRef = useRef<MutationObserver | null>(null);
  const navMutationObserverRef = useRef<MutationObserver | null>(null);
  const onboardingStepBeforeSubmitRef = useRef<string | null>(null);
  const prevPathnameRef = useRef<string | null>(pathname ?? null);
  const suppressCurrentAuthSkeletonRef = useRef(false);

  loadingRef.current = loading;

  function clearHideTimer() {
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }

  function clearNavFallbackTimer() {
    if (navFallbackTimerRef.current) {
      window.clearTimeout(navFallbackTimerRef.current);
      navFallbackTimerRef.current = null;
    }
  }

  function disconnectSubmitObserver() {
    if (submitMutationObserverRef.current) {
      submitMutationObserverRef.current.disconnect();
      submitMutationObserverRef.current = null;
    }
  }

  function disconnectNavObserver() {
    if (navMutationObserverRef.current) {
      navMutationObserverRef.current.disconnect();
      navMutationObserverRef.current = null;
    }
  }

  function scheduleFinishLoading(minVisibleMs: number) {
    clearHideTimer();
    const elapsed = Date.now() - navStartedAtRef.current;
    hideTimerRef.current = window.setTimeout(() => {
      hideTimerRef.current = null;
      loadingCauseRef.current = null;
      setLoading(false);
    }, Math.max(0, minVisibleMs - elapsed));
  }

  useEffect(() => {
    const onClickCapture = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (!target) return;
      const lockTarget = getLockableClickTarget(target);
      if (lockTarget && lockTarget.dataset.eidLock !== "off") {
        if (lockTarget.dataset.eidLocked === "1") {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        lockElement(lockTarget, {
          disableNative: lockTarget instanceof HTMLButtonElement || lockTarget instanceof HTMLInputElement,
        });
      }

      const linkEl = target.closest("a[href]") as HTMLAnchorElement | null;
      if (!linkEl || linkEl.dataset.eidLock === "off") return;
      if (!isSameOriginNavigationLink(linkEl)) return;

      if (linkEl.dataset.eidLocked === "1") {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      lockElement(linkEl);
      clearHideTimer();
      clearNavFallbackTimer();
      disconnectNavObserver();
      loadingCauseRef.current = "nav";
      navStartedAtRef.current = Date.now();
      setLoading(true);
      navFallbackTimerRef.current = window.setTimeout(() => {
        navFallbackTimerRef.current = null;
        if (loadingCauseRef.current === "nav") {
          loadingCauseRef.current = null;
          setLoading(false);
        }
      }, NAV_LOADING_FALLBACK_MS);
    };

    const onSubmitCapture = (event: SubmitEvent) => {
      const form = event.target as HTMLFormElement | null;
      if (!form) return;
      clearHideTimer();
      clearNavFallbackTimer();
      loadingCauseRef.current = "submit";
      navStartedAtRef.current = Date.now();
      setLoading(true);
      if (authPath && !isOnboarding) {
        /* No submit de auth, oculta o skeleton da própria tela atual. */
        suppressCurrentAuthSkeletonRef.current = true;
        /* Trata submit de auth como navegação para exibir skeleton da próxima rota. */
        loadingCauseRef.current = "nav";
        navFallbackTimerRef.current = window.setTimeout(() => {
          navFallbackTimerRef.current = null;
          if (loadingCauseRef.current === "nav") {
            loadingCauseRef.current = null;
            setLoading(false);
          }
        }, 6000);
        return;
      }

      if (isOnboarding) {
        const currentStep = readOnboardingStepFromDom();
        onboardingStepBeforeSubmitRef.current = currentStep;
        if (currentStep) setOnboardingSkeletonStep(currentStep);
      } else {
        onboardingStepBeforeSubmitRef.current = null;
      }

      /* Para submits na mesma rota (server actions), só libera após mudança real no conteúdo. */
      disconnectSubmitObserver();
      const main = document.getElementById("app-main-column");
      if (main) {
        submitMutationObserverRef.current = new MutationObserver(() => {
          if (isOnboarding) {
            const currentStep = readOnboardingStepFromDom();
            if (currentStep) setOnboardingSkeletonStep(currentStep);
            if (currentStep === onboardingStepBeforeSubmitRef.current) {
              return;
            }
          }
          disconnectSubmitObserver();
          scheduleFinishLoading(380);
        });
        submitMutationObserverRef.current.observe(main, {
          childList: true,
          subtree: true,
          attributes: false,
          characterData: false,
        });
      }
    };

    document.addEventListener("click", onClickCapture, true);
    document.addEventListener("submit", onSubmitCapture, true);
    return () => {
      document.removeEventListener("click", onClickCapture, true);
      document.removeEventListener("submit", onSubmitCapture, true);
    };
  }, [authPath, isOnboarding]);

  /* Navegação: só libera quando houver mudança real no conteúdo após trocar a rota. */
  useEffect(() => {
    if (!(loadingRef.current && loadingCauseRef.current === "nav")) return;
    const prevPath = prevPathnameRef.current;
    const cameFromAuth = isAuthPath(prevPath);

    /* Auth: não precisa observer agressivo, finaliza com mínimo visível curto. */
    if (authPath && !isOnboarding) {
      clearNavFallbackTimer();
      scheduleFinishLoading(760);
      return () => {
        clearHideTimer();
      };
    }

    disconnectNavObserver();
    const main = document.getElementById("app-main-column");
    if (main) {
      navMutationObserverRef.current = new MutationObserver(() => {
        disconnectNavObserver();
        clearNavFallbackTimer();
        scheduleFinishLoading(cameFromAuth ? 1200 : 420);
      });
      navMutationObserverRef.current.observe(main, {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: false,
      });
    }
    return () => {
      clearHideTimer();
      disconnectNavObserver();
    };
  }, [pathname]);

  /* Formulários / server actions: mantém loading por mais tempo para evitar flash da tela anterior. */
  useEffect(() => {
    if (!loading) {
      clearHideTimer();
      suppressCurrentAuthSkeletonRef.current = false;
      setShowSkeleton(false);
      return;
    }
    if (loadingCauseRef.current !== "submit") return;
    /* Auth: saída curta e previsível. Onboarding: mantém janela maior. */
    clearHideTimer();
    const timeoutMs = authPath && !isOnboarding ? 1200 : 8000;
    hideTimerRef.current = window.setTimeout(() => {
      hideTimerRef.current = null;
      loadingCauseRef.current = null;
      setLoading(false);
    }, timeoutMs);
    return () => {
      clearHideTimer();
      disconnectSubmitObserver();
      disconnectNavObserver();
    };
  }, [loading, authPath, isOnboarding]);

  /* Failsafe global: nunca deixar loading preso indefinidamente. */
  useEffect(() => {
    if (!loading) return;
    const hardStopMs = authPath && !isOnboarding ? 3500 : 12000;
    const t = window.setTimeout(() => {
      loadingCauseRef.current = null;
      setLoading(false);
    }, hardStopMs);
    return () => window.clearTimeout(t);
  }, [loading, authPath, isOnboarding]);

  useEffect(() => {
    if (!loading) {
      setShowSkeleton(false);
      return;
    }
    if (isOnboarding) {
      const currentStep = readOnboardingStepFromDom();
      if (currentStep) setOnboardingSkeletonStep(currentStep);
    }
    const showDelayMs = authPath && !isOnboarding ? 40 : 120;
    const t = window.setTimeout(() => setShowSkeleton(true), showDelayMs);
    return () => window.clearTimeout(t);
  }, [loading, isOnboarding, authPath]);

  useEffect(() => {
    if (!showSkeleton) {
      setContentTopOffsetPx(0);
      return;
    }
    const updateOffset = () => {
      const fixedTopbar = document.querySelector("header.fixed.left-0.right-0.top-0.z-50") as HTMLElement | null;
      setContentTopOffsetPx(fixedTopbar?.offsetHeight ?? 0);
    };
    updateOffset();
    window.addEventListener("resize", updateOffset);
    return () => window.removeEventListener("resize", updateOffset);
  }, [showSkeleton]);

  useEffect(() => {
    return () => {
      disconnectSubmitObserver();
      disconnectNavObserver();
    };
  }, []);

  useEffect(() => {
    prevPathnameRef.current = pathname ?? null;
    if (!authPath) suppressCurrentAuthSkeletonRef.current = false;
  }, [pathname]);

  /* Evita efeito "subindo de baixo para cima" ao trocar de tela nesses fluxos. */
  useEffect(() => {
    if (!isAuthOrOnboarding) return;
    const root = document.documentElement;
    const prevBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    const main = document.getElementById("app-main-column");
    if (main) main.scrollTo({ top: 0, left: 0, behavior: "auto" });
    const raf = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      if (main) main.scrollTo({ top: 0, left: 0, behavior: "auto" });
      root.style.scrollBehavior = prevBehavior;
    });
    return () => {
      window.cancelAnimationFrame(raf);
      root.style.scrollBehavior = prevBehavior;
    };
  }, [pathname, isAuthOrOnboarding]);

  return (
    <>
      <div
        aria-hidden
        className={`pointer-events-none fixed left-0 right-0 top-0 z-[90] h-[3px] overflow-hidden shadow-[0_1px_8px_rgba(37,99,235,0.35)] transition-opacity duration-300 sm:h-[2px] ${
          loading ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="eid-top-loading-bar h-full w-full rounded-b-sm" />
      </div>
      <div
        aria-hidden
        style={{
          top: `${contentTopOffsetPx}px`,
        }}
        className={`pointer-events-none fixed bottom-0 left-0 right-0 z-[85] transition-opacity duration-300 ${
          showSkeleton ? "opacity-100" : "opacity-0"
        }`}
      >
        {authPath && !isOnboarding && suppressCurrentAuthSkeletonRef.current ? null : (
        <div className={`eid-loading-skeleton-screen ${isOnboarding ? "eid-loading-skeleton-screen-onboarding" : ""}`}>
          {isOnboarding ? (
            <OnboardingExactSkeleton step={onboardingSkeletonStep} />
          ) : authSkeletonScreen ? (
            <AuthExactSkeleton screen={authSkeletonScreen} />
          ) : (
            <>
              <div className="eid-loading-skeleton-block h-8 w-40 rounded-xl" />
              <div className="eid-loading-skeleton-block h-24 w-full rounded-2xl" />
              <div className="grid grid-cols-2 gap-3">
                <div className="eid-loading-skeleton-block h-20 rounded-2xl" />
                <div className="eid-loading-skeleton-block h-20 rounded-2xl" />
              </div>
              <div className="eid-loading-skeleton-block h-14 w-full rounded-xl" />
              <div className="eid-loading-skeleton-block h-14 w-[85%] rounded-xl" />
              <div className="eid-loading-skeleton-block h-14 w-[72%] rounded-xl" />
            </>
          )}
        </div>
        )}
      </div>
    </>
  );
}
