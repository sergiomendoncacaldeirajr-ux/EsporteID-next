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
 * Grade e unidades: modo monetização `mensalidade_plataforma` exige 1º pagamento PaaS;
 * modo de reserva 100% gratuitas idem; demais combinações seguem regra de reserva.
 */
export function podeCriarAgendaEUnidades(esp: EspacoOperacaoFlags): { ok: boolean; motivo: string } {
  if (esp.paas_aprovado_operacao_sem_gateway) {
    return { ok: true, motivo: "" };
  }
  const monet = String(esp.modo_monetizacao ?? "misto");
  if (monet === "mensalidade_plataforma") {
    if (esp.paas_primeiro_pagamento_mensal_recebido_em) {
      // segue para checagem modo_reserva gratuita (redundante se já pagou)
    } else {
      return { ok: false, motivo: MSG_PAAS_PRIMEIRO };
    }
  }
  const modo = String(esp.modo_reserva ?? "mista");
  if (modo === "mista" || modo === "paga") {
    return { ok: true, motivo: "" };
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
