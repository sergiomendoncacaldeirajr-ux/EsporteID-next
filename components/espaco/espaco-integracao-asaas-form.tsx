"use client";

import { useActionState } from "react";
import { salvarDadosContaAsaasParceiroAction } from "@/app/espaco/actions";

const initial = { ok: false, message: "" };

export function FormAsaasParceiro({
  espacoId,
  defaultNome,
  defaultCpf,
  defaultEmail,
}: {
  espacoId: number;
  defaultNome: string;
  defaultCpf: string;
  defaultEmail: string;
}) {
  const [state, formAction, pending] = useActionState(salvarDadosContaAsaasParceiroAction, initial);
  return (
    <form action={formAction} className="space-y-3 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/80 p-4">
      <input type="hidden" name="espaco_id" value={espacoId} />
      <h2 className="text-sm font-bold text-eid-fg">Dados do titular (Asaas)</h2>
      <label className="block text-xs text-eid-text-secondary">
        Nome / razão social
        <input
          name="nome_razao_social"
          required
          minLength={3}
          defaultValue={defaultNome}
          className="eid-input-dark mt-1 w-full rounded-xl px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-xs text-eid-text-secondary">
        CPF ou CNPJ (só números)
        <input
          name="cpf_cnpj"
          required
          minLength={11}
          defaultValue={defaultCpf}
          className="eid-input-dark mt-1 w-full rounded-xl px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-xs text-eid-text-secondary">
        E-mail
        <input
          name="email"
          type="email"
          required
          defaultValue={defaultEmail}
          className="eid-input-dark mt-1 w-full rounded-xl px-3 py-2 text-sm"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="eid-btn-primary w-full rounded-xl px-4 py-3 text-sm font-bold"
      >
        {pending ? "Salvando…" : "Salvar dados no EsporteID"}
      </button>
      {state.message ? (
        <p className={`text-xs ${state.ok ? "text-eid-primary-300" : "text-red-300"}`}>{state.message}</p>
      ) : null}
    </form>
  );
}
