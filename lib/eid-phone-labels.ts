import type { Labels } from "react-phone-number-input";
import ptBR from "react-phone-number-input/locale/pt-BR.json";

/**
 * Labels em pt-BR (nome completo de cada país) + rótulo do campo.
 * `pt-BR.json` já define `phone` ("Telefone"); omitimos antes do spread para não gerar
 * chave duplicada no bundle (esbuild / workerd).
 */
const ptBRLabels = ptBR as Record<string, string>;
const { phone: _phoneDefault, ...ptBRRest } = ptBRLabels;

export const EID_PHONE_LABELS: Labels = {
  ...ptBRRest,
  phone: "WhatsApp",
} as Labels;
