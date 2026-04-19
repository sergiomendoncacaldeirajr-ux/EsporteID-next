"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { atualizarLocalizacaoMatch } from "@/app/match/actions";

type Props = {
  hasLocation: boolean;
};

export function MatchLocationPrompt({ hasLocation }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function requestLocation() {
    setError(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Seu navegador não suporta geolocalização.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        startTransition(async () => {
          const r = await atualizarLocalizacaoMatch(lat, lng);
          if (!r.ok) {
            setError(r.message);
            return;
          }
          router.refresh();
        });
      },
      (err) => {
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Permissão negada. Ative a localização nas configurações do navegador."
            : "Não foi possível obter sua posição. Tente novamente."
        );
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  }

  if (hasLocation) {
    return (
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/80 px-3 py-2">
        <p className="text-xs text-eid-text-secondary">
          Localização atual ativa para o radar (atualizada ao tocar abaixo).
        </p>
        <button
          type="button"
          onClick={requestLocation}
          disabled={pending}
          className="rounded-lg border border-eid-primary-500/40 px-3 py-1.5 text-xs font-semibold text-eid-fg transition hover:bg-eid-primary-500/10 disabled:opacity-50"
        >
          {pending ? "Atualizando…" : "Atualizar posição"}
        </button>
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-xl border border-eid-primary-500/30 bg-eid-primary-500/10 p-4">
      <p className="text-sm font-semibold text-eid-fg">Localização necessária para o Match</p>
      <p className="mt-1 text-xs leading-relaxed text-eid-text-secondary">
        O radar usa sua posição atual para mostrar atletas e formações próximas. Toque no botão e permita o acesso à localização.
      </p>
      {error ? (
        <p className="mt-2 rounded-lg border border-red-400/30 bg-red-500/10 px-2 py-1 text-xs text-red-200">{error}</p>
      ) : null}
      <button
        type="button"
        onClick={requestLocation}
        disabled={pending}
        className="eid-btn-primary mt-3 w-full rounded-xl py-3 text-sm font-bold disabled:opacity-50 sm:w-auto sm:px-6"
      >
        {pending ? "Obtendo localização…" : "Usar minha localização atual"}
      </button>
    </div>
  );
}
