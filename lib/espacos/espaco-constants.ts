/** Alinhado a `eg_modo_reserva_ck` em `espacos_genericos`. */
export type ModoReserva = "gratuita" | "paga";

/** Estado transitório enquanto dono de espaço migra do modo antigo "mista". */
export type ModoReservaPendente = ModoReserva | "mista_pendente_escolha";

/** Alinhado a `eg_modo_monetizacao_ck`. */
export type ModoMonetizacaoEspaco = "mensalidade_plataforma" | "apenas_reservas";

/** Alinhado a `eg_socios_men_espaco_ck`. */
export type SociosMensalidadeEspacoFlag = "off" | "em_breve" | "on";

/** Alinhado a `espacos_genericos_clube_assinaturas_socios_ck`. */
export type ClubeAssinaturaSociosFlag = "off" | "em_breve" | "on";

/** Controla como novos membros entram no espaço gratuito. */
export type EntradaMembroModo = "automatica" | "manual";

/** Formas de pagamento que o espaço aceita para reservas pagas. */
export type FormaPagamento = "pix" | "cartao" | "boleto";

/** Mapeamento para o billingType do Asaas. */
export const FORMA_PAGAMENTO_ASAAS: Record<FormaPagamento, string> = {
  pix: "PIX",
  cartao: "CREDIT_CARD",
  boleto: "BOLETO",
};

export const FORMA_PAGAMENTO_LABEL: Record<FormaPagamento, string> = {
  pix: "PIX",
  cartao: "Cartão de crédito",
  boleto: "Boleto bancário",
};
