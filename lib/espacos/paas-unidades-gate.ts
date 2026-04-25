import type { SupabaseClient } from "@supabase/supabase-js";
import { podeCriarAgendaEUnidades, type EspacoOperacaoFlags } from "@/lib/espacos/operacao-gate";

export type PaaSUnidadeGateInfo = {
  podeCriarUnidade: boolean;
  motivoBloqueio: string | null;
  unidadesTotal: number;
  maxUnidadesPlano: number | null;
  planoMensalId: number | null;
  planoNome: string | null;
  modoMonetizacao: string;
};

/**
 * Combina regra de pagamento PaaS + limite de unidades do plano catálogo (quando mensalidade_plataforma).
 */
export async function getPaaSUnidadeGateInfo(
  supabase: SupabaseClient,
  espacoId: number
): Promise<PaaSUnidadeGateInfo> {
  const { data: eg } = await supabase
    .from("espacos_genericos")
    .select(
      "id, modo_reserva, modo_monetizacao, paas_aprovado_operacao_sem_gateway, paas_primeiro_pagamento_mensal_recebido_em"
    )
    .eq("id", espacoId)
    .maybeSingle();

  const modoMonetizacao = String((eg as { modo_monetizacao?: string | null } | null)?.modo_monetizacao ?? "misto");
  const flags: EspacoOperacaoFlags = {
    id: espacoId,
    modo_reserva: (eg as { modo_reserva?: string | null } | null)?.modo_reserva ?? null,
    modo_monetizacao: modoMonetizacao,
    paas_aprovado_operacao_sem_gateway: (eg as { paas_aprovado_operacao_sem_gateway?: boolean | null } | null)
      ?.paas_aprovado_operacao_sem_gateway,
    paas_primeiro_pagamento_mensal_recebido_em: (
      eg as { paas_primeiro_pagamento_mensal_recebido_em?: string | null } | null
    )?.paas_primeiro_pagamento_mensal_recebido_em,
  };

  const operacao = podeCriarAgendaEUnidades(flags);

  const { count } = await supabase
    .from("espaco_unidades")
    .select("id", { count: "exact", head: true })
    .eq("espaco_generico_id", espacoId);
  const unidadesTotal = count ?? 0;

  let maxUnidadesPlano: number | null = null;
  let planoMensalId: number | null = null;
  let planoNome: string | null = null;

  if (modoMonetizacao === "mensalidade_plataforma") {
    const { data: assin } = await supabase
      .from("espaco_assinaturas_plataforma")
      .select("plano_mensal_id, plano_nome")
      .eq("espaco_generico_id", espacoId)
      .maybeSingle();
    planoMensalId = (assin as { plano_mensal_id?: number | null } | null)?.plano_mensal_id ?? null;
    planoNome = (assin as { plano_nome?: string | null } | null)?.plano_nome ?? null;

    if (planoMensalId) {
      const { data: p } = await supabase
        .from("espaco_plano_mensal_plataforma")
        .select("max_unidades, nome")
        .eq("id", planoMensalId)
        .maybeSingle();
      maxUnidadesPlano = (p as { max_unidades?: number | null } | null)?.max_unidades ?? null;
      if (!planoNome && p && (p as { nome?: string }).nome) {
        planoNome = String((p as { nome: string }).nome);
      }
    }
  }

  let motivoBloqueio: string | null = null;
  if (!operacao.ok) {
    motivoBloqueio = operacao.motivo;
  } else if (modoMonetizacao === "mensalidade_plataforma") {
    if (!planoMensalId) {
      motivoBloqueio =
        "Escolha o plano da plataforma (faixa de quadras) em Financeiro antes de cadastrar unidades. Depois, conclua o pagamento para liberar a criação.";
    } else if (maxUnidadesPlano != null && unidadesTotal >= maxUnidadesPlano) {
      motivoBloqueio = `O plano atual (${planoNome ?? "—"}) permite até ${maxUnidadesPlano} quadra(s)/unidade(s). Para cadastrar mais, altere o plano em Financeiro ou fale com o suporte.`;
    }
  }

  const podeCriarUnidade = operacao.ok && !motivoBloqueio;

  return {
    podeCriarUnidade,
    motivoBloqueio,
    unidadesTotal,
    maxUnidadesPlano,
    planoMensalId,
    planoNome,
    modoMonetizacao,
  };
}
