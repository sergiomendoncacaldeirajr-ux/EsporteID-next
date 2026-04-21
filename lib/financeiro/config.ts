export type FinanceiroConfig = {
  asaas_taxa_percentual: number;
  plataforma_sobre_taxa_gateway: number;
  plataforma_sobre_taxa_gateway_promo: number;
  torneio_taxa_fixa: number;
  torneio_taxa_promo: number;
  promocao_dias: number;
  professor_taxa_fixa: number;
  professor_taxa_fixa_promo: number;
  professor_plataforma_sobre_taxa_gateway: number;
  professor_plataforma_sobre_taxa_gateway_promo: number;
  professor_promocao_ativa: boolean;
  professor_promocao_ate: string | null;
  espaco_taxa_fixa: number;
  espaco_taxa_fixa_promo: number;
  espaco_plataforma_sobre_taxa_gateway: number;
  espaco_plataforma_sobre_taxa_gateway_promo: number;
  espaco_promocao_ativa: boolean;
  espaco_promocao_ate: string | null;
  torneio_promocao_ativa: boolean;
  torneio_promocao_ate: string | null;
};

type ConfigInput = Partial<Record<keyof FinanceiroConfig, unknown>> | null | undefined;

function num(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bool(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function dateValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function promocaoAtiva(flag: boolean, ate: string | null) {
  if (!flag) return false;
  if (!ate) return true;
  const expiresAt = new Date(ate).getTime();
  return Number.isFinite(expiresAt) ? expiresAt >= Date.now() : true;
}

export function normalizeFinanceiroConfig(input: ConfigInput): FinanceiroConfig {
  return {
    asaas_taxa_percentual: num(input?.asaas_taxa_percentual, 0.01),
    plataforma_sobre_taxa_gateway: num(input?.plataforma_sobre_taxa_gateway, 0.5),
    plataforma_sobre_taxa_gateway_promo: num(input?.plataforma_sobre_taxa_gateway_promo, 0.2),
    torneio_taxa_fixa: num(input?.torneio_taxa_fixa, 3),
    torneio_taxa_promo: num(input?.torneio_taxa_promo, 1),
    promocao_dias: Math.max(0, Math.round(num(input?.promocao_dias, 90))),
    professor_taxa_fixa: num(input?.professor_taxa_fixa, 0),
    professor_taxa_fixa_promo: num(input?.professor_taxa_fixa_promo, 0),
    professor_plataforma_sobre_taxa_gateway: num(
      input?.professor_plataforma_sobre_taxa_gateway ?? input?.plataforma_sobre_taxa_gateway,
      0.5
    ),
    professor_plataforma_sobre_taxa_gateway_promo: num(
      input?.professor_plataforma_sobre_taxa_gateway_promo ??
        input?.plataforma_sobre_taxa_gateway_promo,
      0.2
    ),
    professor_promocao_ativa: bool(input?.professor_promocao_ativa, false),
    professor_promocao_ate: dateValue(input?.professor_promocao_ate),
    espaco_taxa_fixa: num(input?.espaco_taxa_fixa, 0),
    espaco_taxa_fixa_promo: num(input?.espaco_taxa_fixa_promo, 0),
    espaco_plataforma_sobre_taxa_gateway: num(
      input?.espaco_plataforma_sobre_taxa_gateway ?? input?.plataforma_sobre_taxa_gateway,
      0.5
    ),
    espaco_plataforma_sobre_taxa_gateway_promo: num(
      input?.espaco_plataforma_sobre_taxa_gateway_promo ??
        input?.plataforma_sobre_taxa_gateway_promo,
      0.2
    ),
    espaco_promocao_ativa: bool(input?.espaco_promocao_ativa, false),
    espaco_promocao_ate: dateValue(input?.espaco_promocao_ate),
    torneio_promocao_ativa: bool(input?.torneio_promocao_ativa, false),
    torneio_promocao_ate: dateValue(input?.torneio_promocao_ate),
  };
}

export function getProfessorFinanceiro(config: ConfigInput) {
  const cfg = normalizeFinanceiroConfig(config);
  const promo = promocaoAtiva(cfg.professor_promocao_ativa, cfg.professor_promocao_ate);
  return {
    asaasTaxaPercentual: cfg.asaas_taxa_percentual,
    taxaFixa: promo ? cfg.professor_taxa_fixa_promo : cfg.professor_taxa_fixa,
    plataformaSobreTaxaGateway: promo
      ? cfg.professor_plataforma_sobre_taxa_gateway_promo
      : cfg.professor_plataforma_sobre_taxa_gateway,
    promocaoAtiva: promo,
  };
}

export function getTorneioFinanceiro(config: ConfigInput) {
  const cfg = normalizeFinanceiroConfig(config);
  const promo = promocaoAtiva(cfg.torneio_promocao_ativa, cfg.torneio_promocao_ate);
  return {
    taxaFixa: promo ? cfg.torneio_taxa_promo : cfg.torneio_taxa_fixa,
    promocaoAtiva: promo,
    promocaoDias: cfg.promocao_dias,
  };
}

export function getEspacoFinanceiro(config: ConfigInput) {
  const cfg = normalizeFinanceiroConfig(config);
  const promo = promocaoAtiva(cfg.espaco_promocao_ativa, cfg.espaco_promocao_ate);
  return {
    asaasTaxaPercentual: cfg.asaas_taxa_percentual,
    taxaFixa: promo ? cfg.espaco_taxa_fixa_promo : cfg.espaco_taxa_fixa,
    plataformaSobreTaxaGateway: promo
      ? cfg.espaco_plataforma_sobre_taxa_gateway_promo
      : cfg.espaco_plataforma_sobre_taxa_gateway,
    promocaoAtiva: promo,
  };
}
