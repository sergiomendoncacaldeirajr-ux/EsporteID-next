"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  href: string;
  className?: string;
  title: string;
  children: ReactNode;
  fullscreen?: boolean;
  topMode?: "default" | "backOnly";
};

export function ProfileEditDrawerTrigger({
  href,
  className,
  title,
  children,
  fullscreen = false,
  topMode = "default",
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  const frameSrc = useMemo(() => {
    const sep = href.includes("?") ? "&" : "?";
    return `${href}${sep}embed=1&theme=${theme}`;
  }, [href, theme]);

  useEffect(() => {
    const rootTheme = document.documentElement.getAttribute("data-eid-theme");
    setTheme(rootTheme === "light" ? "light" : "dark");

    const observer = new MutationObserver(() => {
      const t = document.documentElement.getAttribute("data-eid-theme");
      setTheme(t === "light" ? "light" : "dark");
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-eid-theme"] });
    return () => observer.disconnect();
  }, []);

  function close() {
    setVisible(false);
    window.setTimeout(() => {
      setOpen(false);
      router.refresh();
    }, 180);
  }

  function openDrawer() {
    setOpen(true);
    window.setTimeout(() => setVisible(true), 10);
  }

  return (
    <>
      <button type="button" onClick={openDrawer} className={className} aria-label={title} title={title}>
        {children}
      </button>
      {open ? (
        <div className="fixed inset-0 z-[90]">
          {!fullscreen ? (
            <button
              type="button"
              aria-label="Fechar painel de edição"
              className={`absolute inset-0 backdrop-blur-[1px] transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"} ${
                theme === "light" ? "bg-slate-900/28" : "bg-black/45"
              }`}
              onClick={close}
            />
          ) : null}
          <aside
            className={`absolute inset-y-0 right-0 w-full ${
              fullscreen ? "max-w-none border-0" : "max-w-[min(100vw,460px)] border-l"
            } border-[color:var(--eid-border-subtle)] bg-eid-bg ${
              fullscreen ? "" : "shadow-[0_0_0_1px_rgba(148,163,184,0.12),-20px_0_40px_-20px_rgba(2,6,23,0.8)]"
            } transition-transform duration-200 ease-out ${
              visible ? "translate-x-0" : "translate-x-[102%]"
            }`}
          >
            {topMode === "backOnly" ? (
              <div className="flex items-center border-b border-[color:var(--eid-border-subtle)] px-3 py-2">
                <button
                  type="button"
                  onClick={close}
                  className="inline-flex h-8 items-center justify-center gap-1 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/65 px-3 text-[10px] font-bold uppercase tracking-[0.07em] text-eid-fg transition-colors hover:border-eid-primary-500/35"
                >
                  <span aria-hidden>←</span>
                  Voltar
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] px-3 py-2">
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
            <iframe title={title} src={frameSrc} className="h-[calc(100%-44px)] w-full border-0 bg-eid-bg" />
          </aside>
        </div>
      ) : null}
    </>
  );
}

