/**
 * Regras de acesso a grade/unidades: modo de reserva + pagamento PaaS / admin.
 */
export type EspacoOperacaoFlags = {
  id: number;
  modo_reserva: string | null;
  modo_monetizacao?: string | null;
  paas_aprovado_operacao_sem_gateway?: boolean | null;
  paas_primeiro_pagamento_mensal_recebido_em?: string | null;
};

const MSG_PAAS_PRIMEIRO =
  "É necessário o primeiro pagamento da mensalidade da plataforma aprovado (Financeiro → PIX) antes de criar quadras/unidades ou a grade. Conclua também a integração de pagamento, se aplicável. Administradores podem liberar excepcionalmente.";

/**
 * Grade e unidades: reservas gratuitas ou mistas exigem mensalidade PaaS;
 * reservas somente pagas usam apenas taxa/comissão por reserva.
 */
export function podeCriarAgendaEUnidades(esp: EspacoOperacaoFlags): { ok: boolean; motivo: string } {
  if (esp.paas_aprovado_operacao_sem_gateway) {
    return { ok: true, motivo: "" };
  }
  const monet = String(esp.modo_monetizacao ?? "misto");
  const modo = String(esp.modo_reserva ?? "mista");
  if (modo === "paga" && monet !== "mensalidade_plataforma") {
    return { ok: true, motivo: "" };
  }
  if (monet === "mensalidade_plataforma") {
    if (esp.paas_primeiro_pagamento_mensal_recebido_em) {
      return { ok: true, motivo: "" };
    } else {
      return { ok: false, motivo: MSG_PAAS_PRIMEIRO };
    }
  }
  if (modo === "mista") {
    return {
      ok: false,
      motivo:
        "Espaço misto usa reservas gratuitas e pagas, portanto precisa de mensalidade da plataforma antes de publicar grade ou criar unidades.",
    };
  }
  if (modo === "gratuita") {
    if (esp.paas_primeiro_pagamento_mensal_recebido_em) {
      return { ok: true, motivo: "" };
    }
    return {
      ok: false,
      motivo:
        "Espaço só com reservas gratuitas: ative a mensalidade PaaS (1º pagamento) em Financeiro, ou conclua a integração, antes de publicar a grade. Administradores podem liberar excepcionalmente.",
    };
  }
  return { ok: true, motivo: "" };
}

/** Configuração de reservas grátis não deve existir se só reservas pagas. */
export function forcarReservasGratisLiberadasFalsas(
  modoReserva: string | null,
  reservasGratisLiberadas: boolean
): boolean {
  if (String(modoReserva ?? "") === "paga" && reservasGratisLiberadas) {
    return false;
  }
  return reservasGratisLiberadas;
}
