import type { SupabaseClient } from "@supabase/supabase-js";

export type MensalidadeNivel =
  | "ok"
  | "aviso"
  | "bloqueado"
  | "sem_assinatura"
  | "isento"
  /** Só usado com modo de reservas 100% gratuitas: paga 1º mensalidade PaaS antes de grade. */
  | "inativo_agenda";

export type MensalidadePainelState = {
  nivel: MensalidadeNivel;
  proximaCobranca: string | null;
  valorMensalCentavos: number;
  mensagem: string;
  diasAteVencimento: number | null;
  diasEmAtraso: number;
  categoria: string;
  modoReserva?: string;
};

function startOfDayBr(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function diffCalendarDays(a: Date, b: Date) {
  return Math.round((startOfDayBr(a).getTime() - startOfDayBr(b).getTime()) / 86400000);
}

export type EiConfigMensalidade = {
  espaco_mensalidade_dias_aviso_antes?: number | null;
  espaco_mensalidade_dias_bloqueio_apos?: number | null;
  espaco_mensalidade_valor_clube_brl?: number | null;
  espaco_mensalidade_valor_condominio_brl?: number | null;
  espaco_mensalidade_valor_centro_brl?: number | null;
  espaco_mensalidade_valor_quadra_brl?: number | null;
  espaco_mensalidade_valor_outro_brl?: number | null;
  espaco_assinatura_base?: number | null;
};

export type AssinPlataformaRow = {
  id: number;
  status: string;
  valor_mensal_centavos: number;
  proxima_cobranca: string | null;
  trial_ate: string | null;
  situacao_override: string | null;
};

export function valorMensalEsperadoCentavos(
  categoria: string,
  ei: EiConfigMensalidade
): number {
  const brl = (v: number | null | undefined) => Math.round((Number(v ?? 0) || 0) * 100);
  switch (categoria) {
    case "clube":
      return brl(ei.espaco_mensalidade_valor_clube_brl ?? ei.espaco_assinatura_base);
    case "condominio":
      return brl(ei.espaco_mensalidade_valor_condominio_brl);
    case "centro_esportivo":
      return brl(ei.espaco_mensalidade_valor_centro_brl);
    case "quadra":
      return brl(ei.espaco_mensalidade_valor_quadra_brl);
    default:
      return brl(ei.espaco_mensalidade_valor_outro_brl ?? ei.espaco_assinatura_base);
  }
}

const hojeRef = () => new Date();

/** Cálculo puro (útil p/ listagens admin sem N queries). */
export type ComputeMensalidadeContext = {
  modoReserva?: string | null;
  modoMonetizacao?: string | null;
  /** Primeiro recebimento da mensalidade PaaS (reservas só gratuitas ou modo mensalidade_plataforma). */
  paasPrimeiroPagamentoMensalRecebidoEm?: string | null;
  /** Admin: liberar grade sem nenhum pagamento. */
  paasAprovadoOperacaoSemGateway?: boolean | null;
};

export function computeMensalidadePainelState(
  eiRaw: Record<string, unknown> | EiConfigMensalidade,
  assinRow: AssinPlataformaRow | null,
  categoriaMensalidade: string,
  agora: Date = hojeRef(),
  ctx: ComputeMensalidadeContext = {}
): MensalidadePainelState {
  const ei = eiRaw as EiConfigMensalidade;
  const avisoDias = Math.max(0, Math.min(60, Math.floor(Number(ei.espaco_mensalidade_dias_aviso_antes ?? 7))));
  const bloqueioDias = Math.max(0, Math.min(90, Math.floor(Number(ei.espaco_mensalidade_dias_bloqueio_apos ?? 10))));
  const hoje = agora;
  const modoR = String(ctx.modoReserva ?? "mista").toLowerCase();
  const modoMonet = String(ctx.modoMonetizacao ?? "misto").toLowerCase();

  if (
    modoMonet === "mensalidade_plataforma" &&
    !ctx.paasAprovadoOperacaoSemGateway &&
    !ctx.paasPrimeiroPagamentoMensalRecebidoEm
  ) {
    return {
      nivel: "inativo_agenda",
      proximaCobranca: assinRow?.proxima_cobranca ?? null,
      valorMensalCentavos:
        assinRow?.valor_mensal_centavos ?? valorMensalEsperadoCentavos(categoriaMensalidade, ei),
      mensagem:
        "Mensalidade da plataforma: conclua o primeiro pagamento em Financeiro para liberar quadras, unidades e a grade. Escolha antes o plano (faixa de quadras) que faz sentido para o seu espaço.",
      diasAteVencimento: null,
      diasEmAtraso: 0,
      categoria: categoriaMensalidade,
      modoReserva: modoR,
    };
  }

  if (modoR === "mista" && modoMonet !== "mensalidade_plataforma") {
    return {
      nivel: "isento",
      proximaCobranca: assinRow?.proxima_cobranca ?? null,
      valorMensalCentavos: 0,
      mensagem:
        "Reservas mista (grátis e pagas): sem mensalidade PaaS. A plataforma cobra só a taxa em reservas pagas, conforme configurado.",
      diasAteVencimento: null,
      diasEmAtraso: 0,
      categoria: categoriaMensalidade,
      modoReserva: "mista",
    };
  }

  if (
    modoR === "gratuita" &&
    !ctx.paasAprovadoOperacaoSemGateway &&
    !ctx.paasPrimeiroPagamentoMensalRecebidoEm
  ) {
    return {
      nivel: "inativo_agenda",
      proximaCobranca: assinRow?.proxima_cobranca ?? null,
      valorMensalCentavos: assinRow?.valor_mensal_centavos ?? valorMensalEsperadoCentavos(categoriaMensalidade, ei),
      mensagem:
        "Reservas 100% gratuitas: pague a primeira mensalidade PaaS em Financeiro (recorrência) e conclua a integração. Depois, a grade é liberada. A equipe EsporteID pode aprovar manualmente, se for o caso.",
      diasAteVencimento: null,
      diasEmAtraso: 0,
      categoria: categoriaMensalidade,
      modoReserva: "gratuita",
    };
  }

  const valorRef = assinRow?.valor_mensal_centavos ?? valorMensalEsperadoCentavos(categoriaMensalidade, ei);

  if (!assinRow) {
    return {
      nivel: "sem_assinatura",
      proximaCobranca: null,
      valorMensalCentavos: valorRef,
      mensagem: "Não há assinatura da plataforma registrada para este espaço. Regularize em Financeiro.",
      diasAteVencimento: null,
      diasEmAtraso: 0,
      categoria: categoriaMensalidade,
    };
  }

  if (assinRow.situacao_override === "isento") {
    return {
      nivel: "isento",
      proximaCobranca: assinRow.proxima_cobranca,
      valorMensalCentavos: valorRef,
      mensagem: "Mensalidade isenta (definido pelo administrador).",
      diasAteVencimento: null,
      diasEmAtraso: 0,
      categoria: categoriaMensalidade,
    };
  }

  if (assinRow.situacao_override === "forcar_bloqueio") {
    return {
      nivel: "bloqueado",
      proximaCobranca: assinRow.proxima_cobranca,
      valorMensalCentavos: valorRef,
      mensagem: "Acesso bloqueado manualmente pelo administrador. Entre em contato com o suporte.",
      diasAteVencimento: null,
      diasEmAtraso: 999,
      categoria: categoriaMensalidade,
    };
  }

  if (String(assinRow.status).toLowerCase() === "trial" && assinRow.trial_ate) {
    const fim = new Date(assinRow.trial_ate);
    if (fim.getTime() > hoje.getTime()) {
      return {
        nivel: "ok",
        proximaCobranca: assinRow.proxima_cobranca,
        valorMensalCentavos: valorRef,
        mensagem: "Período de trial ativo.",
        diasAteVencimento: diffCalendarDays(fim, hoje),
        diasEmAtraso: 0,
        categoria: categoriaMensalidade,
      };
    }
  }

  if (!assinRow.proxima_cobranca) {
    return {
      nivel: "ok",
      proximaCobranca: null,
      valorMensalCentavos: valorRef,
      mensagem: "Sem data de vencimento cadastrada — acompanhe o financeiro.",
      diasAteVencimento: null,
      diasEmAtraso: 0,
      categoria: categoriaMensalidade,
    };
  }

  const venc = new Date(`${assinRow.proxima_cobranca}T12:00:00`);
  if (Number.isNaN(venc.getTime())) {
    return {
      nivel: "ok",
      proximaCobranca: assinRow.proxima_cobranca,
      valorMensalCentavos: valorRef,
      mensagem: "Data de vencimento inválida. Verifique a assinatura.",
      diasAteVencimento: null,
      diasEmAtraso: 0,
      categoria: categoriaMensalidade,
    };
  }

  const diasAte = diffCalendarDays(venc, hoje);
  const atraso = diasAte < 0 ? -diasAte : 0;

  if (diasAte > 0 && diasAte <= avisoDias) {
    return {
      nivel: "aviso",
      proximaCobranca: assinRow.proxima_cobranca,
      valorMensalCentavos: valorRef,
      mensagem: `A mensalidade vence em ${diasAte} dia(s) (${assinRow.proxima_cobranca}). Evite atraso para manter o painel liberado.`,
      diasAteVencimento: diasAte,
      diasEmAtraso: 0,
      categoria: categoriaMensalidade,
    };
  }

  if (diasAte === 0) {
    return {
      nivel: "aviso",
      proximaCobranca: assinRow.proxima_cobranca,
      valorMensalCentavos: valorRef,
      mensagem: "A mensalidade vence hoje. Efetue o pagamento para evitar restrições.",
      diasAteVencimento: 0,
      diasEmAtraso: 0,
      categoria: categoriaMensalidade,
    };
  }

  if (atraso > 0 && atraso <= bloqueioDias) {
    return {
      nivel: "aviso",
      proximaCobranca: assinRow.proxima_cobranca,
      valorMensalCentavos: valorRef,
      mensagem: `Pagamento em atraso há ${atraso} dia(s). O painel será bloqueado após ${bloqueioDias} dia(s) de atraso.`,
      diasAteVencimento: -atraso,
      diasEmAtraso: atraso,
      categoria: categoriaMensalidade,
    };
  }

  if (atraso > bloqueioDias) {
    return {
      nivel: "bloqueado",
      proximaCobranca: assinRow.proxima_cobranca,
      valorMensalCentavos: valorRef,
      mensagem: `Inadimplência: ${atraso} dia(s) após o vencimento. Regularize em Financeiro para reativar o painel.`,
      diasAteVencimento: -atraso,
      diasEmAtraso: atraso,
      categoria: categoriaMensalidade,
    };
  }

  return {
    nivel: "ok",
    proximaCobranca: assinRow.proxima_cobranca,
    valorMensalCentavos: valorRef,
    mensagem: "Mensalidade em dia.",
    diasAteVencimento: diasAte,
    diasEmAtraso: 0,
    categoria: categoriaMensalidade,
  };
}

/**
 * Carrega do Supabase (painel do dono) e calcula o estado.
 */
export async function getMensalidadePainelState(
  supabase: SupabaseClient,
  espacoGenericoId: number,
  categoriaMensalidade: string
): Promise<MensalidadePainelState> {
  const { data: ei } = await supabase.from("ei_financeiro_config").select("*").eq("id", 1).maybeSingle();
  const { data: assin } = await supabase
    .from("espaco_assinaturas_plataforma")
    .select("id, status, valor_mensal_centavos, proxima_cobranca, trial_ate, situacao_override")
    .eq("espaco_generico_id", espacoGenericoId)
    .maybeSingle();
  const { data: eg } = await supabase
    .from("espacos_genericos")
    .select(
      "modo_reserva, modo_monetizacao, paas_aprovado_operacao_sem_gateway, paas_primeiro_pagamento_mensal_recebido_em"
    )
    .eq("id", espacoGenericoId)
    .maybeSingle();
  const ctx: ComputeMensalidadeContext = {
    modoReserva: (eg as { modo_reserva?: string | null } | null)?.modo_reserva,
    modoMonetizacao: (eg as { modo_monetizacao?: string | null } | null)?.modo_monetizacao,
    paasAprovadoOperacaoSemGateway: (eg as { paas_aprovado_operacao_sem_gateway?: boolean | null } | null)
      ?.paas_aprovado_operacao_sem_gateway,
    paasPrimeiroPagamentoMensalRecebidoEm: (
      eg as { paas_primeiro_pagamento_mensal_recebido_em?: string | null } | null
    )?.paas_primeiro_pagamento_mensal_recebido_em,
  };
  return computeMensalidadePainelState(
    (ei ?? {}) as Record<string, unknown>,
    assin as AssinPlataformaRow | null,
    categoriaMensalidade,
    hojeRef(),
    ctx
  );
}
