"use client";

import { ImageIcon } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

type Props = {
  src: string | null;
  alt?: string;
};

export function EspacoUnidadeFoto({ src, alt = "" }: Props) {
  const [failed, setFailed] = useState(false);
  const cleanSrc = src?.trim();

  if (!cleanSrc || failed) {
    return (
      <div className="grid h-20 w-20 shrink-0 place-items-center rounded-xl border border-dashed border-[color:var(--eid-border-subtle)] bg-eid-surface/60 text-eid-text-secondary">
        <span className="flex flex-col items-center gap-1 text-[10px]">
          <ImageIcon className="h-4 w-4" aria-hidden />
          Sem foto
        </span>
      </div>
    );
  }

  return (
    <Image
      src={cleanSrc}
      alt={alt}
      width={80}
      height={80}
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-20 w-20 shrink-0 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/60 object-cover"
    />
  );
}
