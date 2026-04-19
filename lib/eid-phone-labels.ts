import type { Labels } from "react-phone-number-input";
import ptBR from "react-phone-number-input/locale/pt-BR.json";

/**
 * Labels em pt-BR (nome completo de cada país) + rótulo do campo.
 * Importante: não substituir por `{ phone: "WhatsApp" }` só — isso remove os nomes
 * e o `<select>` passa a exibir só códigos ISO (BR, US…).
 */
export const EID_PHONE_LABELS: Labels = {
  ...(ptBR as Labels),
  phone: "WhatsApp",
};
