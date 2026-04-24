import { LEGAL_VERSIONS } from "./versions";

/** Campos de `profiles` usados pelo gate de consentimento (alinhar aos selects). */
export const PROFILE_LEGAL_ACCEPTANCE_COLUMNS =
  "termos_aceitos_em, privacidade_aceitos_em, termos_versao, privacidade_versao" as const;

export type ProfileLegalAcceptance = {
  termos_aceitos_em: string | null;
  privacidade_aceitos_em: string | null;
  termos_versao: string | null;
  privacidade_versao: string | null;
};

/** Aceite válido para a versão canônica atual (app + LGPD). */
export function legalAcceptanceIsCurrent(
  p: ProfileLegalAcceptance | null | undefined
): boolean {
  if (!p?.termos_aceitos_em || !p.privacidade_aceitos_em) return false;
  return (
    p.termos_versao === LEGAL_VERSIONS.termos &&
    p.privacidade_versao === LEGAL_VERSIONS.privacidade
  );
}
