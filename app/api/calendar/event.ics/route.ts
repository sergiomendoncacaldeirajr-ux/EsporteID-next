import { createIcsEvent } from "@/lib/calendar/ics";

export const runtime = "edge";

function textParam(url: URL, name: string, fallback = "") {
  return (url.searchParams.get(name) ?? fallback).trim().slice(0, 180);
}

function numberParam(url: URL, name: string) {
  const value = Number(url.searchParams.get(name) ?? "");
  return Number.isFinite(value) ? value : 0;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const title = textParam(url, "title", "EsporteID");
  const startMs = numberParam(url, "startMs");
  const endMs = numberParam(url, "endMs");

  if (startMs <= 0 || endMs <= startMs) {
    return new Response("Evento inválido.", { status: 400 });
  }

  const ics = createIcsEvent({
    title,
    startMs,
    endMs,
    location: textParam(url, "location"),
    description: textParam(url, "description", "Evento EsporteID"),
  });

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="esporteid-evento.ics"',
      "Cache-Control": "no-store",
    },
  });
}
