export function formatCooldownRemaining(untilIso: string | null | undefined, nowDate: Date = new Date()): string | null {
  if (!untilIso) return null;
  const until = new Date(untilIso);
  if (Number.isNaN(until.getTime())) return null;
  const now = new Date(nowDate);
  if (until.getTime() <= now.getTime()) return "Liberado agora.";

  let cursor = new Date(now);
  let months = 0;

  while (true) {
    const next = new Date(cursor);
    next.setMonth(next.getMonth() + 1);
    if (next.getTime() <= until.getTime()) {
      months += 1;
      cursor = next;
      continue;
    }
    break;
  }

  const msDay = 24 * 60 * 60 * 1000;
  const days = Math.max(0, Math.ceil((until.getTime() - cursor.getTime()) / msDay));

  const parts: string[] = [];
  if (months > 0) parts.push(`${months} ${months === 1 ? "mês" : "meses"}`);
  if (days > 0) parts.push(`${days} ${days === 1 ? "dia" : "dias"}`);

  if (parts.length === 0) return "Menos de 1 dia.";
  if (parts.length === 1) return `Faltam ${parts[0]}.`;
  return `Faltam ${parts[0]} e ${parts[1]}.`;
}
