"use client";

import { useActionState } from "react";
import { atualizarDuplaRegistro, type DuplaActionState } from "@/app/perfil-dupla/actions";

const initial: DuplaActionState = { ok: false, message: "" };

export function PerfilDuplaEditForm({
  duplaId,
  username,
  bio,
}: {
  duplaId: number;
  username: string | null;
  bio: string | null;
}) {
  const [state, formAction, pending] = useActionState(atualizarDuplaRegistro, initial);

  return (
    <details className="mt-3 rounded-xl border border-eid-primary-500/35 bg-eid-primary-500/8 p-3 text-left">
      <summary className="cursor-pointer text-sm font-semibold text-eid-primary-200">Editar perfil da dupla (@ e bio)</summary>
      <p className="mt-2 text-[10px] text-eid-text-secondary">
        Só quem criou o registro da dupla pode alterar estes campos. O parceiro edita o próprio cadastro de atleta no onboarding.
      </p>
      <form action={formAction} className="mt-3 grid gap-2">
        <input type="hidden" name="dupla_id" value={duplaId} />
        <input
          name="username"
          defaultValue={username ?? ""}
          placeholder="@username da dupla (opcional)"
          className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg"
        />
        <textarea
          name="bio"
          rows={3}
          defaultValue={bio ?? ""}
          placeholder="Bio da dupla"
          className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg"
        />
        <button type="submit" disabled={pending} className="eid-btn-primary rounded-xl px-4 py-2.5 text-sm font-semibold">
          {pending ? "Salvando..." : "Salvar dupla"}
        </button>
        {state.message ? (
          <p className={`text-xs ${state.ok ? "text-eid-primary-300" : "text-red-300"}`}>{state.message}</p>
        ) : null}
      </form>
    </details>
  );
}
