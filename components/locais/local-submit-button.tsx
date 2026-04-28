"use client";

import { useFormStatus } from "react-dom";

export function LocalSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="eid-btn-primary w-full rounded-xl font-extrabold disabled:opacity-60"
      style={{ minHeight: "36px", fontSize: "11px", letterSpacing: "0.02em" }}
    >
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/35 border-t-white" aria-hidden />
          Cadastrando local...
        </span>
      ) : (
        "Cadastrar sugestão"
      )}
    </button>
  );
}
