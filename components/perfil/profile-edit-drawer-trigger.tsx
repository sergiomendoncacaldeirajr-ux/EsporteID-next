"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  href: string;
  className?: string;
  title: string;
  children: ReactNode;
};

export function ProfileEditDrawerTrigger({ href, className, title, children }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const frameSrc = useMemo(() => {
    const sep = href.includes("?") ? "&" : "?";
    return `${href}${sep}embed=1`;
  }, [href]);

  function close() {
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className} aria-label={title} title={title}>
        {children}
      </button>
      {open ? (
        <div className="fixed inset-0 z-[90]">
          <button
            type="button"
            aria-label="Fechar painel de edição"
            className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
            onClick={close}
          />
          <aside className="absolute inset-y-0 right-0 w-full max-w-[min(100vw,460px)] border-l border-[color:var(--eid-border-subtle)] bg-eid-bg shadow-[0_0_0_1px_rgba(148,163,184,0.12),-20px_0_40px_-20px_rgba(2,6,23,0.8)]">
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
            <iframe title={title} src={frameSrc} className="h-[calc(100%-44px)] w-full border-0 bg-eid-bg" />
          </aside>
        </div>
      ) : null}
    </>
  );
}

