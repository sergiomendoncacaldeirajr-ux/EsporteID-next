"use client";

import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmarMaioridadeMatchAction } from "@/app/conta/confirmar-maioridade-match/actions";
import { maxDataNascimentoMaior18 } from "@/lib/match/idade-maioridade";

export function ConfirmarMaioridadeMatchForm({ nextPath, nome: _nome }: { nextPath: string; nome: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setMsg(null);
    startTransition(async () => {
      const r = await confirmarMaioridadeMatchAction(fd);
      if (r.ok) {
        router.push(r.next);
        router.refresh();
        return;
      }
      setMsg(r.error);
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-6 space-y-4 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/60 p-4"
    >
      <input type="hidden" name="next" value={nextPath} />

      <div>
        <label htmlFor="cm-data-nasc" className="text-[11px] font-bold uppercase tracking-wide text-eid-text-secondary">
          Data de nascimento
        </label>
        <input
          id="cm-data-nasc"
          name="data_nascimento"
          type="date"
          required
          min="1900-01-01"
          max={maxDataNascimentoMaior18()}
          className="eid-input-dark mt-1 w-full rounded-lg px-3 py-2 text-sm"
        />
        <p className="mt-1 text-[10px] text-eid-text-secondary">É necessário ter 18 anos completos. Menores não podem usar o Desafio.</p>
      </div>

      <label className="flex cursor-pointer gap-2 text-xs leading-snug text-eid-fg">
        <input type="checkbox" name="aceito" required className="mt-0.5 rounded border-eid-border-subtle" />
        <span>
          Declaro, sob as penas da lei, que as informações são verdadeiras, que tenho{" "}
          <strong>18 anos ou mais</strong> e que desejo acessar a funcionalidade Desafio nestes termos.
        </span>
      </label>

      {msg ? <p className="text-sm text-red-300">{msg}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="eid-btn-primary w-full rounded-xl py-2.5 text-sm font-bold disabled:opacity-50"
      >
        {pending ? "Registrando…" : "Confirmar e continuar"}
      </button>
    </form>
  );
}
