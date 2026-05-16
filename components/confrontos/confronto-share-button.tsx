"use client";

import { Share2 } from "lucide-react";
import { hapticSuccess } from "@/lib/haptics";

interface Props {
  title: string;
  text: string;
  path: string;
}

export function ConfrontoShareButton({ title, text, path }: Props) {
  const handleShare = async () => {
    const url = `${window.location.origin}${path}`;
    try {
      const { Capacitor } = await import("@capacitor/core");
      if (Capacitor.isNativePlatform()) {
        const { Share } = await import("@capacitor/share");
        await Share.share({ title, text, url, dialogTitle: title });
      } else if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title, text, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
      await hapticSuccess();
    } catch {
      /* user cancelled — ignore */
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl border border-eid-action-500/22 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--eid-action-500)_10%,var(--eid-card)),color-mix(in_srgb,var(--eid-action-500)_6%,var(--eid-surface)))] px-4 text-[12px] font-black uppercase tracking-[0.05em] text-eid-action-300 transition hover:border-eid-action-500/38 hover:brightness-105 active:scale-[0.98] eid-light:border-orange-200/60 eid-light:bg-orange-50 eid-light:text-orange-600"
    >
      <Share2 className="h-4 w-4 shrink-0" aria-hidden />
      Compartilhar resultado
    </button>
  );
}
