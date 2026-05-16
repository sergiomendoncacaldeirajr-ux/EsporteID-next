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
      } else if (navigator.share) {
        await navigator.share({ title, text, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
      await hapticSuccess();
    } catch {
      // user cancelled or share not supported
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-eid-primary-500/35 bg-eid-primary-500/10 text-[13px] font-black text-eid-primary-300 transition active:scale-[0.97] eid-light:border-eid-primary-500/30 eid-light:text-eid-primary-700"
    >
      <Share2 className="h-4 w-4 shrink-0" aria-hidden />
      Compartilhar resultado
    </button>
  );
}
