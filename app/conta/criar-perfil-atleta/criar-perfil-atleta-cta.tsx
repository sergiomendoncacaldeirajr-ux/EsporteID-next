"use client";

import { useFormState } from "react-dom";
import type { OnboardingActionResult } from "@/app/onboarding/actions";
import { submitCriarPerfilAtletaForm } from "./actions";

export function CriarPerfilAtletaCta() {
  const [state, action] = useFormState(submitCriarPerfilAtletaForm, undefined as OnboardingActionResult | undefined);

  return (
    <form action={action} className="mt-6 flex flex-col gap-3">
      {state && !state.ok ? (
        <p className="rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-2 text-sm text-red-200">{state.message}</p>
      ) : null}
      <button
        type="submit"
        className="rounded-2xl bg-eid-primary-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-eid-primary-500/25 transition hover:bg-eid-primary-600"
      >
        Criar meu perfil de atleta
      </button>
      <p className="text-center text-[11px] text-eid-text-secondary">
        Você vai escolher esportes, experiência e completar a ficha como nos demais atletas.
      </p>
    </form>
  );
}
