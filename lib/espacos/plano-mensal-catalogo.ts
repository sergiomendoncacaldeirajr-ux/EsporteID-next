/** Texto humano para faixa de unidades do catálogo PaaS (plano mensal plataforma). */
export type NivelPlanoPaaS = "essencial" | "premium";

export type PlanoPaaSResumo = {
  id: number;
  nome: string;
  min_unidades: number;
  max_unidades: number | null;
  valor_mensal_centavos: number;
  socios_mensal_modo?: string | null;
  ordem?: number | null;
};

export function descricaoFaixaUnidadesPaaS(minUnidades: number, maxUnidades: number | null): string {
  if (maxUnidades == null) {
    return `${minUnidades} ou mais quadras/unidades`;
  }
  if (minUnidades === maxUnidades) {
    return minUnidades === 1
      ? "até 1 quadra ou unidade"
      : `até ${maxUnidades} quadras ou unidades`;
  }
  return `de ${minUnidades} a ${maxUnidades} quadras ou unidades`;
}

export function inferirNivelPlanoPaaS(plano: PlanoPaaSResumo, planos: PlanoPaaSResumo[]): NivelPlanoPaaS {
  const ordenados = [...planos].sort(
    (a, b) =>
      a.valor_mensal_centavos - b.valor_mensal_centavos ||
      (a.max_unidades ?? 9999) - (b.max_unidades ?? 9999) ||
      a.min_unidades - b.min_unidades ||
      (a.ordem ?? 0) - (b.ordem ?? 0) ||
      a.id - b.id
  );
  const index = ordenados.findIndex((item) => item.id === plano.id);
  if (index <= 0) return "essencial";
  return "premium";
}

export function perfilComercialPlanoPaaS(nivel: NivelPlanoPaaS) {
  if (nivel === "essencial") {
    return {
      nome: "Essencial",
      titulo: "Espaço por associação",
      resumo: "Mensalidade da plataforma para operar o espaço com membro ou sócio aprovado.",
      beneficios: [
        "Reservas liberadas só para membros ou sócios aprovados",
        "Cadastro de quadras conforme limite do plano",
        "Regras de associação e aprovação manual",
        "Base para planos de sócio e benefícios do clube",
      ],
      cta: "Escolher plano essencial",
      sociosModo: "nenhum",
    };
  }
  return {
    nome: "Premium",
    titulo: "Associação com gestão ampliada",
    resumo: "Fluxo completo de associação com mensalidade da plataforma e suporte ampliado ao clube.",
    beneficios: [
      "Tudo do Essencial",
      "Gestão ampliada de planos e benefícios",
      "Melhor encaixe para clubes com recorrência de sócios",
      "Operação completa do espaço por associação",
    ],
    cta: "Escolher plano premium",
    sociosModo: "disponivel",
  };
}

export function detalheValorESociosPlanoPaaS(row: {
  valor_mensal_centavos: number;
  socios_mensal_modo?: string | null;
}): string {
  const valor = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((Number(row.valor_mensal_centavos) || 0) / 100);
  const socios =
    row.socios_mensal_modo === "disponivel"
      ? "Gestão de mensalidade de sócios disponível no plano."
      : row.socios_mensal_modo === "em_breve"
        ? "Gestão de mensalidade de sócios em evolução neste plano."
        : "Associação manual sem checkout recorrente de sócio neste plano.";
  return `Mensalidade da plataforma ${valor}/mês · ${socios}`;
}
