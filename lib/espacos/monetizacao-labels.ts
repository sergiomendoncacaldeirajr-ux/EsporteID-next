import type { ModoReserva, ModoMonetizacaoEspaco, SociosMensalidadeEspacoFlag } from "@/lib/espacos/espaco-constants";

export const MODO_RESERVA_LABEL: Record<ModoReserva, string> = {
  gratuita: "Gratuita",
  paga: "Paga",
  mista: "Mista (conforme unidade / regra interna)",
};

export const MODO_MONETIZACAO_LABEL: Record<ModoMonetizacaoEspaco, string> = {
  mensalidade_plataforma: "Mensalidade da plataforma (+ reservas, se houver)",
  apenas_reservas: "Só taxas de reserva (sem mensalidade PaaS)",
  misto: "Mensalidade + taxas de reserva",
};

export const SOCIOS_MENSAL_ESPACO_LABEL: Record<SociosMensalidadeEspacoFlag, string> = {
  off: "Sem gestão de mensalidade de sócios neste local",
  em_breve: "Mensalidade de sócios: em breve (catálogo pode existir, fluxo ainda desligado)",
  on: "Mensalidade de sócios ativa (quando o módulo estiver liberado)",
};
