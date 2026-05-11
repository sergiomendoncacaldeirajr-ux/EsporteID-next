import { buildCalendarIcs } from "@/lib/calendar/ics";

export const dynamic = "force-dynamic";

function readParam(url: URL, key: string, fallback = "") {
  return (url.searchParams.get(key) ?? fallback).trim();
}

export function GET(request: Request) {
  const url = new URL(request.url);
  const title = readParam(url, "title", "Partida EsporteID");
  const startIso = readParam(url, "start");
  const endIso = readParam(url, "end");
  const location = readParam(url, "location") || null;
  const description = readParam(url, "description", "Partida EsporteID - acompanhe pelo app");
  const appUrl = readParam(url, "url") || null;

  if (!startIso || !endIso || Number.isNaN(new Date(startIso).getTime()) || Number.isNaN(new Date(endIso).getTime())) {
    return new Response("Evento de calendário inválido.", { status: 400 });
  }

  const ics = buildCalendarIcs({
    title,
    startIso,
    endIso,
    location,
    description,
    url: appUrl,
  });

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="partida-esporteid.ics"',
      "Cache-Control": "no-store",
    },
  });
}
