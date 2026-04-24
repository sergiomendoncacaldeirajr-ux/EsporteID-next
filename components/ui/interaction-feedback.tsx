"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const LOCK_MS = 1400;

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
  if (isFormSubmitControl(el)) {
    requestAnimationFrame(() => el.classList.add("eid-is-locked"));
  } else {
    el.classList.add("eid-is-locked");
  }

  const canDisableNative =
    disableNative &&
    (el instanceof HTMLButtonElement || el instanceof HTMLInputElement) &&
    !isFormSubmitControl(el);

  /* disabled no mesmo tick do capture pode cancelar o clique atual no WebKit. */
  if (canDisableNative) {
    queueMicrotask(() => {
      if (el.dataset.eidLocked === "1") el.disabled = true;
    });
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

/**
 * Bloqueio leve contra duplo clique em links/botões; scroll estável em auth/onboarding.
 * Transição entre páginas: View Transitions no layout (sem overlay de carregamento).
 */
export function InteractionFeedback() {
  const pathname = usePathname();
  const authPath = isAuthPath(pathname);
  const isOnboarding = (pathname ?? "").startsWith("/onboarding");
  const isAuthOrOnboarding = authPath || isOnboarding;

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
    };

    document.addEventListener("click", onClickCapture, true);
    return () => {
      document.removeEventListener("click", onClickCapture, true);
    };
  }, []);

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

  return null;
}
