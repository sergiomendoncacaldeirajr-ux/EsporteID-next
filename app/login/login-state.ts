/** Tipos/estado inicial fora de `actions.ts` — arquivo com `'use server'` só exporta a action async. */

export type LoginActionState = {
  error: string | null;
  pendingConfirmationEmail: string | null;
  redirectTo: string | null;
};

export const loginActionInitial: LoginActionState = {
  error: null,
  pendingConfirmationEmail: null,
  redirectTo: null,
};
