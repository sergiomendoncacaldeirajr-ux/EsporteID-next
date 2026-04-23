/** Emoji por nome do esporte (mesma lógica usada no perfil EID). */
export function sportIconEmoji(nomeEsporte: string): string {
  const n = nomeEsporte.toLowerCase();
  if (n.includes("tênis") || n.includes("tenis")) return "🎾";
  if (n.includes("fut")) return "⚽";
  if (n.includes("basquete")) return "🏀";
  if (n.includes("vôlei") || n.includes("volei")) return "🏐";
  if (n.includes("hand")) return "🤾";
  if (n.includes("beach")) return "🏖️";
  if (n.includes("natação") || n.includes("natacao")) return "🏊";
  return "🏅";
}
