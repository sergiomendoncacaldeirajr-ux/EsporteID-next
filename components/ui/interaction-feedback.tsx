"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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

function lockElement(el: HTMLElement) {
  if (el.dataset.eidLocked === "1") return false;
  el.dataset.eidLocked = "1";
  el.classList.add("eid-is-locked");

  if (el instanceof HTMLButtonElement || el instanceof HTMLInputElement) {
    el.disabled = true;
  } else {
    el.setAttribute("aria-disabled", "true");
  }

  window.setTimeout(() => {
    el.dataset.eidLocked = "0";
    el.classList.remove("eid-is-locked");
    if (el instanceof HTMLButtonElement || el instanceof HTMLInputElement) {
      el.disabled = false;
    } else {
      el.removeAttribute("aria-disabled");
    }
  }, LOCK_MS);

  return true;
}

export function InteractionFeedback() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const navStartedAtRef = useRef<number>(0);

  useEffect(() => {
    const onClickCapture = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (!target) return;

      const submitEl = target.closest('button[type="submit"],input[type="submit"]') as HTMLElement | null;
      if (submitEl) {
        if (submitEl.dataset.eidLocked === "1") {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        lockElement(submitEl);
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
      navStartedAtRef.current = Date.now();
      setLoading(true);
    };

    const onSubmitCapture = (event: SubmitEvent) => {
      const form = event.target as HTMLFormElement | null;
      if (!form) return;
      form.querySelectorAll('button[type="submit"],input[type="submit"]').forEach((el) => {
        lockElement(el as HTMLElement);
      });
      navStartedAtRef.current = Date.now();
      setLoading(true);
    };

    document.addEventListener("click", onClickCapture, true);
    document.addEventListener("submit", onSubmitCapture, true);
    return () => {
      document.removeEventListener("click", onClickCapture, true);
      document.removeEventListener("submit", onSubmitCapture, true);
    };
  }, []);

  useEffect(() => {
    if (!loading) return;
    const elapsed = Date.now() - navStartedAtRef.current;
    const minVisibleMs = 260;
    const wait = Math.max(0, minVisibleMs - elapsed);
    const t = window.setTimeout(() => setLoading(false), wait);
    return () => window.clearTimeout(t);
    // pathname/search mudaram => navegação finalizou
  }, [pathname, loading]);

  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed left-0 right-0 top-0 z-[90] h-[2px] overflow-hidden transition-opacity duration-200 ${
        loading ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="eid-top-loading-bar h-full w-full" />
    </div>
  );
}
