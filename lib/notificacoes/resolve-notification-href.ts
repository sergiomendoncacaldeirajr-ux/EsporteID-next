import { isAmistosoAceiteInformativoNotif } from "@/lib/notificacoes/amistoso-aceite-informativo";

export type NotificationRouteInput = {
  tipo?: string | null;
  mensagem?: string | null;
};

export function resolveNotificationHref({ tipo, mensagem }: NotificationRouteInput): string {
  const tipoNorm = String(tipo ?? "").trim().toLowerCase();
  const msgNorm = String(mensagem ?? "").trim().toLowerCase();

  if (tipoNorm === "match" || tipoNorm === "desafio") {
    if (isAmistosoAceiteInformativoNotif(tipoNorm, msgNorm)) {
      return "/comunidade#notificacoes";
    }
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
    if (msgNorm.includes("pedido para entrar") || msgNorm.includes("entrar no elenco")) {
      return "/comunidade#equipe-pedidos-entrada";
    }
    if (msgNorm.includes("pedido de entrada enviado")) return "/comunidade#equipe-pedidos-enviados";
    if (msgNorm.includes("convite enviado")) return "/comunidade#equipe-convites-enviados";
    if (msgNorm.includes("convite")) return "/comunidade#equipe-convites";
    if (msgNorm.includes("sugest")) return "/comunidade#equipe-sugestoes";
    return "/comunidade";
  }

  return "/comunidade#notificacoes";
}
