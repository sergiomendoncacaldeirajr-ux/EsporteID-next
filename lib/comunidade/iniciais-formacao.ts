/** Iniciais para avatar placeholder de time/dupla (nome da formação). */
export function iniciaisFormacaoNome(nome: string | null | undefined): string {
  const n = String(nome ?? "").trim();
  if (!n) return "?";
  const parts = n.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return n.slice(0, 2).toUpperCase();
}
