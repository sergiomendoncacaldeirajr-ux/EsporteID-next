"use client";

import { useFormStatus } from "react-dom";

export function LocalSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="inline-flex min-h-[38px] w-full items-center justify-center gap-2 rounded-xl border border-[#ff8a2b] bg-[#ff7a00] px-4 text-[11px] font-black uppercase tracking-[0.03em] text-white shadow-[0_8px_18px_-12px_rgba(249,115,22,0.7)] transition hover:bg-[#ff8617] disabled:opacity-60"
    >
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/35 border-t-white" aria-hidden />
          <span className="animate-pulse">Cadastrando...</span>
        </span>
      ) : (
        <>
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
            <path d="M3 11.9 20.4 4a.8.8 0 0 1 1.1 1l-4.4 14a.8.8 0 0 1-1.4.2l-2.8-3.6-4.2 2.2a.8.8 0 0 1-1.2-.8l.6-4.4-4-1.2a.8.8 0 0 1-.1-1.5Z" />
          </svg>
          Cadastrar sugestão
        </>
      )}
    </button>
  );
}
