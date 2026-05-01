"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const HIGHLIGHT_CLASS = "eid-hash-target-highlight";
const HIGHLIGHT_MS = 2000;

function highlightCurrentHashTarget() {
  if (typeof window === "undefined") return;
  const raw = window.location.hash ?? "";
  const id = raw.startsWith("#") ? raw.slice(1) : raw;
  if (!id) return;
  const target = document.getElementById(decodeURIComponent(id));
  if (!target) return;

  target.classList.remove(HIGHLIGHT_CLASS);
  void target.getBoundingClientRect();
  target.classList.add(HIGHLIGHT_CLASS);
  window.setTimeout(() => target.classList.remove(HIGHLIGHT_CLASS), HIGHLIGHT_MS);
}

export function HashTargetHighlight() {
  const pathname = usePathname();

  useEffect(() => {
    const t = window.setTimeout(() => {
      highlightCurrentHashTarget();
    }, 80);
    return () => window.clearTimeout(t);
  }, [pathname]);

  useEffect(() => {
    const onHash = () => highlightCurrentHashTarget();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  return null;
}

