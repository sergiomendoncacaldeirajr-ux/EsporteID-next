export type TipoOperacaoEspaco = "reserva_paga" | "associacao";

type ResolveInput = {
  modoReserva?: string | null;
  modoMonetizacao?: string | null;
};

function normalizarModoReserva(value: string | null | undefined) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw === "paga") return "paga" as const;
  if (raw === "gratuita") return "gratuita" as const;
  if (raw === "mista" || raw === "mista_pendente_escolha") return "gratuita" as const;
  return "gratuita" as const;
}

function normalizarModoMonetizacao(value: string | null | undefined) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw === "apenas_reservas") return "apenas_reservas" as const;
  if (raw === "mensalidade_plataforma") return "mensalidade_plataforma" as const;
  return null;
}

export function resolverTipoOperacaoEspaco(input: ResolveInput): TipoOperacaoEspaco {
  const modoReserva = normalizarModoReserva(input.modoReserva);
  const modoMonetizacao = normalizarModoMonetizacao(input.modoMonetizacao);
  if (modoReserva === "paga" && modoMonetizacao !== "mensalidade_plataforma") {
    return "reserva_paga";
  }
  return "associacao";
}

export function espacoExigeMensalidadePlataforma(input: ResolveInput) {
  return resolverTipoOperacaoEspaco(input) === "associacao";
}

export function espacoExigeAssociacaoParaReservar(input: ResolveInput) {
  return resolverTipoOperacaoEspaco(input) === "associacao";
}

export function espacoPermiteReservaAvulsaPublica(input: ResolveInput) {
  return resolverTipoOperacaoEspaco(input) === "reserva_paga";
}

export function espacoUsaCatalogoPaaS(input: ResolveInput) {
  return resolverTipoOperacaoEspaco(input) === "associacao";
}

export function espacoAceitaAprovacaoAutomaticaMembro(input: ResolveInput) {
  return resolverTipoOperacaoEspaco(input) === "reserva_paga";
}

export function modoReservaCanonicamenteGratuito(value: string | null | undefined) {
  return normalizarModoReserva(value) === "gratuita";
}

export function modoReservaCanonico(value: string | null | undefined) {
  return normalizarModoReserva(value);
}
