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
      style={{ minHeight: "44px", fontSize: "12px", letterSpacing: "0.02em" }}
    >
      {pending ? "Cadastrando local..." : "Cadastrar sugestão"}
    </button>
  );
}
