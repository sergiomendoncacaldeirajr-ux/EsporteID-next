/** Chave localStorage: aviso único sobre janela de 4h ao ligar modo amistoso. */
export const AMISTOSO_4H_AVISO_STORAGE_KEY = "eid_amistoso_4h_janela_aviso_v1";

/** Mensagem exibida só na primeira vez que o usuário liga o modo amistoso (neste aparelho). */
export const AMISTOSO_4H_AVISO_TEXTO =
  "O modo amistoso fica ativo por até 4 horas. Se você não desligar antes, ele desliga sozinho ao fim desse prazo. Você pode desligar manualmente a qualquer momento.";

/** True se o usuário já aceitou o aviso (ou em SSR, para não bloquear). */
export function amistoso4hFirstUseWarningJaAceito(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(AMISTOSO_4H_AVISO_STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

/** Chamar após o usuário confirmar que leu o aviso e quer ligar o modo. */
export function marcarAmistoso4hFirstUseWarningAceito(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(AMISTOSO_4H_AVISO_STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}
