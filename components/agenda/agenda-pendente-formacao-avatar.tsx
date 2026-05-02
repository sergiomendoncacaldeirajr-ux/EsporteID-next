"use client";

import Image from "next/image";
import { ProfileEditDrawerTrigger } from "@/components/perfil/profile-edit-drawer-trigger";
import { ProfileEidPerformanceSeal } from "@/components/perfil/profile-eid-performance-seal";
import { iniciaisFormacaoNome } from "@/lib/comunidade/iniciais-formacao";

type Props = {
  timeId: number;
  nome: string;
  escudoUrl: string | null;
  eidTime: number;
  /** Ex.: `/agenda` — vira query `from` no perfil embed. */
  fromPath?: string;
};

export function AgendaPendenteFormacaoAvatar({ timeId, nome, escudoUrl, eidTime, fromPath = "/agenda" }: Props) {
  const inic = iniciaisFormacaoNome(nome).slice(0, 2) || "?";
  const href = `/perfil-time/${timeId}?from=${encodeURIComponent(fromPath)}`;
  const label = `Abrir perfil: ${nome}`;

  return (
    <div className="flex flex-col items-center gap-1">
      <ProfileEditDrawerTrigger
        href={href}
        title={label}
        fullscreen
        topMode="backOnly"
        className="rounded-xl border-0 bg-transparent p-0 ring-offset-2 transition-opacity hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-eid-primary-500"
      >
        {escudoUrl ? (
          <Image
            src={escudoUrl}
            alt=""
            width={44}
            height={44}
            unoptimized
            className="pointer-events-none h-10 w-10 rounded-xl border border-[color:var(--eid-border-subtle)] object-cover md:h-11 md:w-11"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface text-[10px] font-black text-eid-primary-300 md:h-11 md:w-11">
            {inic}
          </div>
        )}
      </ProfileEditDrawerTrigger>
      <ProfileEidPerformanceSeal notaEid={eidTime} compact />
    </div>
  );
}
