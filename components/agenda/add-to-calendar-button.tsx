"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  title: string;
  startIso: string;
  durationMinutes?: number;
  location?: string | null;
};

function icsDate(iso: string) {
  return iso.replace(/[-:]/g, "").split(".")[0] + "Z";
}

function addMinutesToIso(iso: string, min: number): string {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() + min);
  return d.toISOString();
}

function buildIcs(title: string, start: string, end: string, location?: string | null): string {
  const esc = (s: string) => s.replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//EsporteID//PT",
    "BEGIN:VEVENT",
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${esc(title)}`,
    "DESCRIPTION:Partida EsporteID – acompanhe pelo app",
    location ? `LOCATION:${esc(location)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return lines.join("\r\n");
}

function googleCalendarUrl(title: string, start: string, end: string, location?: string | null): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${icsDate(start)}/${icsDate(end)}`,
    details: "Partida EsporteID – acompanhe pelo app",
  });
  if (location) params.set("location", location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
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

  function downloadIcs() {
    const content = buildIcs(title, startIso, endIso, location);
    const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "partida-esporteid.ics";
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Salvar na agenda do celular"
        className="inline-flex items-center gap-1 rounded border border-eid-primary-500/20 bg-transparent px-1.5 py-0.5 text-[8px] font-semibold tracking-wide text-eid-primary-400 transition hover:border-eid-primary-500/35 hover:text-eid-primary-300 active:scale-[0.97]"
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

      {open && (
        <div className="absolute bottom-full left-1/2 z-50 mb-1 w-44 -translate-x-1/2 overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card shadow-[0_8px_24px_-6px_rgba(0,0,0,0.55)]">
          <a
            href={googleCalendarUrl(title, startIso, endIso, location)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-[10px] font-semibold text-eid-fg transition hover:bg-eid-surface/70"
          >
            <span className="text-xs leading-none" aria-hidden>📅</span>
            Google Agenda
          </a>
          <div className="mx-3 border-t border-[color:var(--eid-border-subtle)]" />
          <button
            type="button"
            onClick={downloadIcs}
            className="flex w-full items-center gap-2 px-3 py-2 text-[10px] font-semibold text-eid-fg transition hover:bg-eid-surface/70"
          >
            <span className="text-xs leading-none" aria-hidden>🍎</span>
            Apple / Outlook (.ics)
          </button>
        </div>
      )}
    </div>
  );
}
