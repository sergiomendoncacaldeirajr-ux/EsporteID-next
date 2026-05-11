export type CalendarEventInput = {
  title: string;
  startIso: string;
  endIso: string;
  location?: string | null;
  description?: string | null;
  url?: string | null;
};

function cleanText(value: string, maxLength = 240) {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function escapeIcsText(value: string) {
  return cleanText(value)
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\n/g, "\\n");
}

export function addMinutesToIso(iso: string, minutes: number): string {
  const date = new Date(iso);
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}

export function icsDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function stableUidPart(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash).toString(36);
}

export function buildCalendarIcs(event: CalendarEventInput): string {
  const start = icsDate(event.startIso);
  const end = icsDate(event.endIso);
  const title = cleanText(event.title) || "Partida EsporteID";
  const description = cleanText(event.description || "Partida EsporteID - acompanhe pelo app");
  const uidSeed = `${title}-${start}-${event.location ?? ""}`;
  const uid = `${stableUidPart(uidSeed)}@esporteid.app`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//EsporteID//Agenda//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    start ? `DTSTART:${start}` : "",
    end ? `DTEND:${end}` : "",
    `SUMMARY:${escapeIcsText(title)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    event.location ? `LOCATION:${escapeIcsText(event.location)}` : "",
    event.url ? `URL:${escapeIcsText(event.url)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  return `${lines.join("\r\n")}\r\n`;
}

export function googleCalendarUrl(event: CalendarEventInput): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: cleanText(event.title) || "Partida EsporteID",
    dates: `${icsDate(event.startIso)}/${icsDate(event.endIso)}`,
    details: cleanText(event.description || "Partida EsporteID - acompanhe pelo app"),
  });
  if (event.location) params.set("location", cleanText(event.location));
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
