"use client";

import { useFormStatus } from "react-dom";

export function AdminDenunciaStatusSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded border border-eid-primary-500/40 px-2 py-1 text-[10px] font-bold text-eid-primary-300 disabled:opacity-60"
    >
      {pending ? "Salvando..." : "Salvar"}
    </button>
  );
}
