"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";

type Props = {
  href: string;
  className?: string;
  title: string;
  children: ReactNode;
  fullscreen?: boolean;
  /** default = título + Fechar · backOnly = só Voltar · backAndClose = Voltar (histórico do iframe) + Fechar */
  topMode?: "default" | "backOnly" | "backAndClose";
  /** Quando true, o botão Voltar fecha o overlay sem usar histórico interno do iframe. */
  disableIframeBack?: boolean;
};

export function ProfileEditDrawerTrigger({
  href,
  className,
  title,
  children,
  fullscreen = false,
  topMode = "default",
  disableIframeBack = false,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof document === "undefined") return "dark";
    return document.documentElement.getAttribute("data-eid-theme") === "light" ? "light" : "dark";
  });
  const [openNonce, setOpenNonce] = useState(0);
  const frameRef = useRef<HTMLIFrameElement | null>(null);

  const frameSrc = useMemo(() => {
    const sep = href.includes("?") ? "&" : "?";
    return `${href}${sep}embed=1&theme=${theme}&open_nonce=${openNonce}`;
  }, [href, theme, openNonce]);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const t = document.documentElement.getAttribute("data-eid-theme");
      setTheme(t === "light" ? "light" : "dark");
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-eid-theme"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    const prevBodyOverscroll = document.body.style.overscrollBehavior;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      document.body.style.overscrollBehavior = prevBodyOverscroll;
    };
  }, [open]);

  function close() {
    setVisible(false);
    window.setTimeout(() => {
      setOpen(false);
      router.refresh();
    }, 180);
  }

  function frameBackOrClose() {
    if (disableIframeBack) {
      close();
      return;
    }
    try {
      const w = frameRef.current?.contentWindow;
      if (w && w.history.length > 1) {
        w.history.back();
        return;
      }
    } catch {
      /* ignore */
    }
    close();
  }

  function openDrawer() {
    setOpenNonce((v) => v + 1);
    setOpen(true);
    window.setTimeout(() => setVisible(true), 10);
  }

  function handleFrameLoad() {
    try {
      const win = frameRef.current?.contentWindow;
      win?.scrollTo(0, 0);
      if (win?.document?.documentElement) win.document.documentElement.scrollTop = 0;
      if (win?.document?.body) win.document.body.scrollTop = 0;
    } catch {
      /* ignore */
    }
  }

  return (
    <>
      <button type="button" onClick={openDrawer} className={className} aria-label={title} title={title}>
        {children}
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[999] isolate">
              {!fullscreen ? (
                <button
                  type="button"
                  aria-label="Fechar painel de edição"
                  className={`absolute inset-0 z-0 backdrop-blur-[1px] transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"} ${
                    theme === "light" ? "bg-slate-900/28" : "bg-black/45"
                  }`}
                  onClick={close}
                />
              ) : null}
              {/*
                iOS: safe-area em filho `absolute` dentro de `fixed` costuma virar 0; `fixed` na própria
                folha + piso (~44px) garante o Voltar abaixo do relógio/notch mesmo quando env() falha.
              */}
              <aside
                className={`fixed bottom-0 right-0 top-0 z-[1] flex min-h-0 w-full flex-col ${
                  fullscreen ? "max-w-none border-0" : "max-w-[min(100vw,460px)] border-l"
                } border-[color:var(--eid-border-subtle)] bg-eid-bg ${
                  fullscreen ? "" : "shadow-[0_0_0_1px_rgba(148,163,184,0.12),-20px_0_40px_-20px_rgba(2,6,23,0.8)]"
                } transition-transform duration-200 ease-out ${
                  visible ? "translate-x-0" : "translate-x-[102%]"
                }`}
                style={{
                  paddingTop:
                    "calc(1rem + max(5.2rem, constant(safe-area-inset-top), env(safe-area-inset-top, 0px)))",
                  overscrollBehavior: "contain",
                }}
              >
                {topMode === "backOnly" ? (
                  <div className="flex shrink-0 items-center border-b border-[color:var(--eid-border-subtle)] px-3 pb-2 pt-3">
                    <button
                      type="button"
                      onClick={close}
                      className="inline-flex min-h-[40px] items-center justify-center gap-1 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/65 px-3 text-[10px] font-bold uppercase tracking-[0.07em] text-eid-fg transition-colors hover:border-eid-primary-500/35"
                    >
                      <span aria-hidden>←</span>
                      Voltar
                    </button>
                  </div>
                ) : topMode === "backAndClose" ? (
                  <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[color:var(--eid-border-subtle)] px-3 pb-2 pt-3">
                    <button
                      type="button"
                      onClick={frameBackOrClose}
                      className="inline-flex min-h-[40px] items-center justify-center gap-1 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/65 px-3 text-[10px] font-bold uppercase tracking-[0.07em] text-eid-fg transition-colors hover:border-eid-primary-500/35"
                    >
                      <span aria-hidden>←</span>
                      Voltar
                    </button>
                    <button
                      type="button"
                      onClick={close}
                      className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-[color:var(--eid-border-subtle)] px-3 text-[10px] font-bold uppercase tracking-[0.06em] text-eid-text-secondary transition-colors hover:text-eid-fg"
                    >
                      Fechar
                    </button>
                  </div>
                ) : (
                  <div className="flex shrink-0 items-center justify-between border-b border-[color:var(--eid-border-subtle)] px-3 pb-2 pt-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-eid-text-secondary">{title}</p>
                    <button
                      type="button"
                      onClick={close}
                      className="inline-flex h-7 items-center justify-center rounded-lg border border-[color:var(--eid-border-subtle)] px-2 text-[10px] font-bold uppercase tracking-[0.06em] text-eid-text-secondary transition-colors hover:text-eid-fg"
                    >
                      Fechar
                    </button>
                  </div>
                )}
                <iframe
                  ref={frameRef}
                  onLoad={handleFrameLoad}
                  title={title}
                  src={frameSrc}
                  className="min-h-0 w-full flex-1 border-0 bg-eid-bg"
                />
              </aside>
            </div>,
            document.body
          )
        : null}
    </>
  );
}

