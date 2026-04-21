"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const LOCK_MS = 1400;
const NAV_LOADING_FALLBACK_MS = 6500;
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
  const [loading, setLoading] = useState(false);
  const navStartedAtRef = useRef<number>(0);
  const loadingCauseRef = useRef<LoadingCause | null>(null);
  const loadingRef = useRef(false);
  const hideTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const navFallbackTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);

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
    };

    document.addEventListener("click", onClickCapture, true);
    document.addEventListener("submit", onSubmitCapture, true);
    return () => {
      document.removeEventListener("click", onClickCapture, true);
      document.removeEventListener("submit", onSubmitCapture, true);
    };
  }, [authPath]);

  /* Navegação: esconde após troca de rota (com tempo mínimo visível). */
  useEffect(() => {
    clearHideTimer();
    if (!(loadingRef.current && loadingCauseRef.current === "nav")) return;
    clearNavFallbackTimer();
    const elapsed = Date.now() - navStartedAtRef.current;
    const minAfterNavMs = 340;
    hideTimerRef.current = window.setTimeout(() => {
      hideTimerRef.current = null;
      loadingCauseRef.current = null;
      setLoading(false);
    }, Math.max(0, minAfterNavMs - elapsed));
    return () => {
      clearHideTimer();
    };
  }, [pathname]);

  /* Formulários / server actions: barra some após um tempo se a rota não mudar. */
  useEffect(() => {
    if (!loading) {
      clearHideTimer();
      return;
    }
    if (loadingCauseRef.current !== "submit") return;
    clearHideTimer();
    hideTimerRef.current = window.setTimeout(() => {
      hideTimerRef.current = null;
      loadingCauseRef.current = null;
      setLoading(false);
    }, 1500);
    return clearHideTimer;
  }, [loading]);

  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed left-0 right-0 top-0 z-[90] h-[3px] overflow-hidden shadow-[0_1px_8px_rgba(37,99,235,0.35)] transition-opacity duration-300 sm:h-[2px] ${
        loading ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="eid-top-loading-bar h-full w-full rounded-b-sm" />
    </div>
  );
}
