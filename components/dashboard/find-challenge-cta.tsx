"use client";

import { Loader2, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  href: string;
  label?: string;
  pendingLabel?: string;
  className?: string;
};

export function FindChallengeCta({
  href,
  label = "Encontrar desafio",
  pendingLabel = "Encontrando...",
  className,
}: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (pending) return;
        setPending(true);
        router.push(href);
      }}
      className={`eid-btn-dashboard-cta relative mt-3 flex w-full items-center justify-center gap-2.5 rounded-xl sm:mt-4 ${className ?? ""} ${
        pending ? "opacity-90" : ""
      }`}
      aria-busy={pending}
      aria-label={pending ? "Encontrando desafios" : "Encontrar desafio"}
    >
      {pending ? (
        <Loader2 className="h-5 w-5 shrink-0 animate-spin text-white drop-shadow-sm" />
      ) : (
        <Zap className="h-5 w-5 shrink-0 text-white drop-shadow-sm" />
      )}
      <span>{pending ? pendingLabel : label}</span>
    </button>
  );
}
