"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const LOCK_MS = 1400;
const NAV_LOADING_FALLBACK_MS = 30000;
type LoadingCause = "nav" | "submit";

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
  const [loading, setLoading] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [contentTopOffsetPx, setContentTopOffsetPx] = useState(0);
  const navStartedAtRef = useRef<number>(0);
  const loadingCauseRef = useRef<LoadingCause | null>(null);
  const loadingRef = useRef(false);
  const hideTimerRef = useRef<number | null>(null);
  const navFallbackTimerRef = useRef<number | null>(null);
  const submitMutationObserverRef = useRef<MutationObserver | null>(null);
  const navMutationObserverRef = useRef<MutationObserver | null>(null);

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

      if (authPath) return;

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
      if (authPath) return;
      const form = event.target as HTMLFormElement | null;
      if (!form) return;
      clearHideTimer();
      clearNavFallbackTimer();
      loadingCauseRef.current = "submit";
      navStartedAtRef.current = Date.now();
      setLoading(true);

      /* Para submits na mesma rota (server actions), só libera após mudança real no conteúdo. */
      disconnectSubmitObserver();
      const main = document.getElementById("app-main-column");
      if (main) {
        submitMutationObserverRef.current = new MutationObserver(() => {
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
  }, [authPath]);

  /* Navegação: só libera quando houver mudança real no conteúdo após trocar a rota. */
  useEffect(() => {
    if (!(loadingRef.current && loadingCauseRef.current === "nav")) return;
    disconnectNavObserver();
    const main = document.getElementById("app-main-column");
    if (main) {
      navMutationObserverRef.current = new MutationObserver(() => {
        disconnectNavObserver();
        clearNavFallbackTimer();
        scheduleFinishLoading(420);
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
      setShowSkeleton(false);
      return;
    }
    if (loadingCauseRef.current !== "submit") return;
    clearHideTimer();
    hideTimerRef.current = window.setTimeout(() => {
      hideTimerRef.current = null;
      loadingCauseRef.current = null;
      setLoading(false);
    }, 8000);
    return () => {
      clearHideTimer();
      disconnectSubmitObserver();
      disconnectNavObserver();
    };
  }, [loading]);

  useEffect(() => {
    if (!loading) {
      setShowSkeleton(false);
      return;
    }
    const t = window.setTimeout(() => setShowSkeleton(true), 120);
    return () => window.clearTimeout(t);
  }, [loading]);

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
        <div className={`eid-loading-skeleton-screen ${isOnboarding ? "eid-loading-skeleton-screen-onboarding" : ""}`}>
          {isOnboarding ? (
            <>
              <div className="eid-loading-skeleton-block h-5 w-24 rounded-lg" />
              <div className="eid-loading-skeleton-block h-4 w-36 rounded-lg" />
              <div className="eid-loading-skeleton-block h-24 w-full rounded-2xl" />
              <div className="space-y-2">
                <div className="eid-loading-skeleton-block h-16 w-full rounded-2xl" />
                <div className="eid-loading-skeleton-block h-16 w-full rounded-2xl" />
                <div className="eid-loading-skeleton-block h-16 w-full rounded-2xl" />
              </div>
              <div className="eid-loading-skeleton-block h-11 w-full rounded-xl" />
            </>
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
      </div>
    </>
  );
}
