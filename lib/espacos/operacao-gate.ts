import { resolverTipoOperacaoEspaco } from "@/lib/espacos/tipo-operacao";

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

/**
 * Grade e unidades: reservas gratuitas ou mistas exigem mensalidade PaaS;
 * reservas somente pagas usam apenas taxa/comissão por reserva.
 */
export function podeCriarAgendaEUnidades(esp: EspacoOperacaoFlags): { ok: boolean; motivo: string } {
  if (esp.paas_aprovado_operacao_sem_gateway) {
    return { ok: true, motivo: "" };
  }

  const tipoOperacao = resolverTipoOperacaoEspaco({
    modoReserva: esp.modo_reserva,
    modoMonetizacao: esp.modo_monetizacao,
  });

  if (tipoOperacao === "reserva_paga") {
    return { ok: true, motivo: "" };
  }

  if (esp.paas_primeiro_pagamento_mensal_recebido_em) {
    return { ok: true, motivo: "" };
  }

  return {
    ok: false,
    motivo:
      "Espaço por associação: ative a mensalidade da plataforma (1º pagamento) em Financeiro, ou conclua a integração, antes de publicar a grade. Administradores podem liberar excepcionalmente.",
  };
}

/** Configuração de reservas grátis não deve existir se só reservas pagas. */
export function forcarReservasGratisLiberadasFalsas(
  modoReserva: string | null,
  reservasGratisLiberadas: boolean
): boolean {
  if (
    resolverTipoOperacaoEspaco({ modoReserva, modoMonetizacao: null }) === "reserva_paga" &&
    reservasGratisLiberadas
  ) {
    return false;
  }
  return reservasGratisLiberadas;
}
