"use client";

import { useEffect, useRef, useState } from "react";
import { addMinutesToIso, googleCalendarUrl } from "@/lib/calendar/ics";

type Props = {
  title: string;
  startIso: string;
  durationMinutes?: number;
  location?: string | null;
};

function isAndroidLike() {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

function isIOSLike() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPhone|iPod|iPad/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function calendarIcsUrl(title: string, start: string, end: string, location?: string | null) {
  const params = new URLSearchParams({
    title,
    start,
    end,
    description: "Partida EsporteID - acompanhe pelo app",
  });
  if (location) params.set("location", location);
  if (typeof window !== "undefined") params.set("url", window.location.href);
  return `/api/calendar/event.ics?${params.toString()}`;
}

export function AddToCalendarButton({ title, startIso, durationMinutes = 90, location }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onOut(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOut);
    return () => document.removeEventListener("mousedown", onOut);
  }, [open]);

  const endIso = addMinutesToIso(startIso, durationMinutes);
  const event = {
    title,
    startIso,
    endIso,
    location,
    description: "Partida EsporteID - acompanhe pelo app",
  };
  const icsUrl = calendarIcsUrl(title, startIso, endIso, location);
  const googleUrl = googleCalendarUrl(event);

  function openBestCalendar() {
    if (isAndroidLike()) {
      window.location.href = googleUrl;
      return;
    }
    window.location.href = icsUrl;
  }

  function openMenu(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    setOpen((v) => !v);
  }

  function openIcs() {
    window.location.href = icsUrl;
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={openBestCalendar}
        aria-label="Salvar na agenda do celular"
        className="inline-flex items-center gap-1 rounded-l border border-eid-primary-500/20 bg-transparent px-1.5 py-0.5 text-[8px] font-semibold tracking-wide text-eid-primary-400 transition hover:border-eid-primary-500/35 hover:text-eid-primary-300 active:scale-[0.97]"
      >
        <svg
          viewBox="0 0 16 16"
          className="h-2.5 w-2.5 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        >
          <rect x="2" y="3" width="12" height="11" rx="2" />
          <path d="M2 7h12M5 1v3M11 1v3" />
        </svg>
        <span>+ agenda</span>
      </button>
      <button
        type="button"
        onClick={openMenu}
        aria-label="Opções de calendário"
        className="-ml-px inline-flex items-center rounded-r border border-eid-primary-500/20 bg-transparent px-1 py-0.5 text-[8px] font-semibold tracking-wide text-eid-primary-400 transition hover:border-eid-primary-500/35 hover:text-eid-primary-300 active:scale-[0.97]"
      >
        <svg viewBox="0 0 16 16" className="h-2.5 w-2.5" fill="currentColor" aria-hidden>
          <path d="M4.2 6.2a.8.8 0 0 1 1.1 0L8 8.9l2.7-2.7a.8.8 0 1 1 1.1 1.1L8.6 10.5a.8.8 0 0 1-1.1 0L4.2 7.3a.8.8 0 0 1 0-1.1Z" />
        </svg>
      </button>

      {open && (
        <div className="absolute bottom-full left-1/2 z-50 mb-1 w-44 -translate-x-1/2 overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card shadow-[0_8px_24px_-6px_rgba(0,0,0,0.55)]">
          <a
            href={googleUrl}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-[10px] font-semibold text-eid-fg transition hover:bg-eid-surface/70"
          >
            <span className="text-xs leading-none" aria-hidden>
              G
            </span>
            Google Agenda
          </a>
          <div className="mx-3 border-t border-[color:var(--eid-border-subtle)]" />
          <button
            type="button"
            onClick={openIcs}
            className="flex w-full items-center gap-2 px-3 py-2 text-[10px] font-semibold text-eid-fg transition hover:bg-eid-surface/70"
          >
            <span className="text-xs leading-none" aria-hidden>
              ICS
            </span>
            Calendário do aparelho
          </button>
          {isIOSLike() ? null : (
            <p className="border-t border-[color:var(--eid-border-subtle)] px-3 py-2 text-[9px] leading-snug text-eid-text-secondary">
              No Android, o Google Agenda costuma abrir direto no app.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
