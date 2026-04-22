/** Idade em anos completos (fuso local do servidor / interpretação da data como local). */
export function idadeEmAnosCompleta(isoDate: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const birth = new Date(y, mo - 1, d);
  if (birth.getFullYear() !== y || birth.getMonth() !== mo - 1 || birth.getDate() !== d) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const md = today.getMonth() - birth.getMonth();
  if (md < 0 || (md === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function formatDateOnlyLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Última data de nascimento possível para completar 18 anos hoje (calendário local). */
export function maxDataNascimentoMaior18(): string {
  const t = new Date();
  return formatDateOnlyLocal(new Date(t.getFullYear() - 18, t.getMonth(), t.getDate()));
}

export function temMaioridade18(isoDate: string): boolean {
  const idade = idadeEmAnosCompleta(isoDate);
  return idade != null && idade >= 18;
}
