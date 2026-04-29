"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  href: string;
  className?: string;
};

export function RankingLoadMoreButton({ href, className = "" }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <button
      type="button"
      className={className}
      disabled={loading}
      aria-busy={loading}
      onClick={() => {
        if (loading) return;
        setLoading(true);
        router.push(href);
      }}
    >
      {loading ? (
        <>
          <span
            aria-hidden
            className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent"
          />
          <span>carregando..</span>
        </>
      ) : (
        <>
          <span>ver mais</span>
          <span aria-hidden className="text-[16px] leading-none">›</span>
        </>
      )}
    </button>
  );
}
