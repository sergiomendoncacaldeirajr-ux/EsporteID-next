/** Avisos informativos de desafio amistoso aceito (sem fluxo de placar na plataforma). */

export function isAmistosoAceiteInformativoNotif(
  tipo: string | null | undefined,
  mensagem: string | null | undefined
): boolean {
  const t = String(tipo ?? "")
    .trim()
    .toLowerCase();
  if (t !== "match") return false;
  const m = String(mensagem ?? "")
    .trim()
    .toLowerCase();
  if (!m.includes("amistoso")) return false;
  if (m.includes("recusad")) return false;
  if (m.includes("cancelad")) return false;
  return (
    m.includes("foi aceito") ||
    m.includes("aceitou o desafio amistoso") ||
    m.includes("aceitou um desafio amistoso") ||
    m.includes("desafio amistoso foi aceito")
  );
}
