/** Texto humano para faixa de unidades do catálogo PaaS (plano mensal plataforma). */
export type NivelPlanoPaaS = "basico" | "intermediario" | "completo";

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
  if (index <= 0) return "basico";
  if (index >= ordenados.length - 1) return "completo";
  return "intermediario";
}

export function perfilComercialPlanoPaaS(nivel: NivelPlanoPaaS) {
  if (nivel === "basico") {
    return {
      nome: "Básico",
      titulo: "Reservas gratuitas",
      resumo: "Somente reservas gratuitas para associados do local.",
      beneficios: [
        "Reservas gratuitas para associados",
        "Cadastro de quadras conforme limite do plano",
        "Sem fila de espera",
        "Sem reservas pagas",
        "Sem recebimento de mensalidades",
      ],
      cta: "Escolher plano básico",
      sociosModo: "nenhum",
    };
  }
  if (nivel === "intermediario") {
    return {
      nome: "Intermediário",
      titulo: "Reservas gratuitas e pagas",
      resumo: "Reservas gratuitas e pagas com opção de fila. Por ser misto, paga mensalidade da plataforma.",
      beneficios: [
        "Reservas gratuitas para associados",
        "Reservas pagas para avulsos",
        "Fila de espera para horários cheios",
        "Cadastro de quadras conforme limite do plano",
        "Exige mensalidade da plataforma",
      ],
      cta: "Escolher plano intermediário",
      sociosModo: "nenhum",
    };
  }
  return {
    nome: "Completo",
    titulo: "Gestão completa",
    resumo: "Tudo incluso: reservas gratuitas/pagas, fila, pagamentos e mensalidades.",
    beneficios: [
      "Reservas gratuitas para associados",
      "Reservas pagas para avulsos",
      "Fila de espera",
      "Recebimento de mensalidades de sócios",
      "Operação completa do espaço",
    ],
    cta: "Escolher plano completo",
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
        : "Sem gestão de mensalidade de sócios neste plano.";
  return `Mensalidade plataforma ${valor}/mês · ${socios}`;
}
