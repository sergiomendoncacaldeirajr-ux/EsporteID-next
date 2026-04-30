export type NotificationRouteInput = {
  tipo?: string | null;
  mensagem?: string | null;
};

export function resolveNotificationHref({ tipo, mensagem }: NotificationRouteInput): string {
  const tipoNorm = String(tipo ?? "").trim().toLowerCase();
  const msgNorm = String(mensagem ?? "").trim().toLowerCase();

  if (tipoNorm === "match" || tipoNorm === "desafio") {
    if (msgNorm.includes("placar") || msgNorm.includes("resultado")) {
      return "/comunidade#resultados-partida";
    }
    if (
      msgNorm.includes("agenda") ||
      msgNorm.includes("agendar") ||
      msgNorm.includes("data e local") ||
      msgNorm.includes("reagendamento")
    ) {
      return "/agenda";
    }
    return "/comunidade#desafio-pedidos";
  }

  if (tipoNorm === "time" || tipoNorm === "convite" || tipoNorm === "candidatura") {
    if (msgNorm.includes("pedido para entrar")) return "/comunidade#equipe-pedidos-enviados";
    if (msgNorm.includes("convite")) return "/comunidade#equipe-convites";
    if (msgNorm.includes("sugest")) return "/comunidade#equipe-sugestoes";
    return "/comunidade#equipe-avisos";
  }

  return "/comunidade#notificacoes";
}
