type CalendarEventInput = {
  title: string;
  description?: string | null;
  location?: string | null;
  startMs: number;
  endMs: number;
};

function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function formatIcsDate(ms: number) {
  return new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function foldIcsLine(line: string) {
  const chunks: string[] = [];
  for (let i = 0; i < line.length; i += 72) chunks.push(i === 0 ? line.slice(i, i + 72) : ` ${line.slice(i, i + 72)}`);
  return chunks.join("\r\n");
}

export function createIcsEvent(input: CalendarEventInput) {
  const startMs = Math.max(0, Math.floor(input.startMs));
  const endMs = Math.max(startMs + 60_000, Math.floor(input.endMs));
  const uid = `esporteid-${startMs}-${Math.abs(input.title.length)}@esporteid.com.br`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//EsporteID//Agenda//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatIcsDate(Date.now())}`,
    `DTSTART:${formatIcsDate(startMs)}`,
    `DTEND:${formatIcsDate(endMs)}`,
    `SUMMARY:${escapeIcsText(input.title)}`,
    `DESCRIPTION:${escapeIcsText(input.description || "Evento EsporteID")}`,
    `LOCATION:${escapeIcsText(input.location || "")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.map(foldIcsLine).join("\r\n")}\r\n`;
}
