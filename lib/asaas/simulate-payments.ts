import { createServiceRoleClient, hasServiceRoleConfig } from "@/lib/supabase/service-role";

export type AsaasSimulationDomain = "locais" | "professores" | "torneios";

export type AsaasSimulationFlags = Record<AsaasSimulationDomain, boolean>;

/**
 * Simula confirmação de pagamento sem depender do webhook Asaas.
 *
 * - **Desenvolvimento:** `EID_SIMULATE_ASAAS_PAYMENTS=true` no .env → liga os três domínios (somente NODE_ENV !== "production").
 * - **Produção / staging:** Admin → Financeiro → marcar Locais, Professores e/ou Torneios.
 */
export async function getAsaasSimulationFlags(): Promise<AsaasSimulationFlags> {
  const envAll =
    process.env.NODE_ENV !== "production" &&
    String(process.env.EID_SIMULATE_ASAAS_PAYMENTS ?? "").trim().toLowerCase() === "true";
  if (envAll) {
    return { locais: true, professores: true, torneios: true };
  }

  if (!hasServiceRoleConfig()) {
    return { locais: false, professores: false, torneios: false };
  }

  const db = createServiceRoleClient();
  const { data } = await db
    .from("ei_financeiro_config")
    .select("asaas_simulacao_locais, asaas_simulacao_professores, asaas_simulacao_torneios")
    .eq("id", 1)
    .maybeSingle();
  return {
    locais: Boolean(data?.asaas_simulacao_locais),
    professores: Boolean(data?.asaas_simulacao_professores),
    torneios: Boolean(data?.asaas_simulacao_torneios),
  };
}

export async function isAsaasSimulationEnabledFor(domain: AsaasSimulationDomain): Promise<boolean> {
  const flags = await getAsaasSimulationFlags();
  return flags[domain];
}

/** Diagnóstico: há algum modo teste ligado? */
export async function isAnyAsaasSimulationEnabled(): Promise<boolean> {
  const f = await getAsaasSimulationFlags();
  return f.locais || f.professores || f.torneios;
}
