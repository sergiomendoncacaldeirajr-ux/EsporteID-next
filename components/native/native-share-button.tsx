"use client";

import { Share2 } from "lucide-react";
import { useState } from "react";

type Props = {
  title: string;
  text?: string;
  path?: string;
  className?: string;
  iconOnly?: boolean;
};

async function sharePayload(payload: { title: string; text?: string; url: string }) {
  if (window.eidNativeShare) {
    await window.eidNativeShare(payload);
    return;
  }

  if (navigator.share) {
    await navigator.share(payload);
    return;
  }

  await navigator.clipboard?.writeText(payload.url);
}

export function NativeShareButton({ title, text, path, className, iconOnly = false }: Props) {
  const [copied, setCopied] = useState(false);

  async function onClick() {
    const url = path ? new URL(path, window.location.origin).toString() : window.location.href;
    try {
      await sharePayload({ title, text: text ?? "Veja no EsporteID", url });
      setCopied(!window.eidNativeShare && !navigator.share);
      window.setTimeout(() => setCopied(false), 1800);
    } catch (error) {
      if ((error as { name?: string })?.name !== "AbortError") {
        await navigator.clipboard?.writeText(url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      }
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={
        className ??
        "inline-flex items-center justify-center gap-1.5 rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/80 px-3 py-1.5 text-[11px] font-bold text-eid-fg transition hover:border-eid-primary-500/45 hover:bg-eid-primary-500/10"
      }
      aria-label="Compartilhar"
      title={copied ? "Link copiado" : "Compartilhar"}
    >
      <Share2 className="h-3.5 w-3.5" aria-hidden />
      {iconOnly ? <span className="sr-only">{copied ? "Link copiado" : "Compartilhar"}</span> : copied ? "Copiado" : "Compartilhar"}
    </button>
  );
}
