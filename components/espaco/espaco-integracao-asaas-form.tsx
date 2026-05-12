"use client";

import { useActionState, useState } from "react";
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
  const [modoIntegracao, setModoIntegracao] = useState("criar_nova");
  return (
    <form action={formAction} className="space-y-3 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/80 p-4">
      <input type="hidden" name="espaco_id" value={espacoId} />
      <input type="hidden" name="modo_integracao" value={modoIntegracao} />
      <h2 className="text-sm font-bold text-eid-fg">Conta de recebimentos Asaas</h2>
      <div className="grid gap-2 sm:grid-cols-2">
        {[
          ["criar_nova", "Criar nova", "Preparar uma nova conta Asaas pelo EsporteID."],
          ["conta_existente", "Usar existente", "Iniciar o vínculo de uma conta Asaas atual."],
        ].map(([id, title, text]) => {
          const selected = modoIntegracao === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setModoIntegracao(id)}
              className={`rounded-xl border p-3 text-left transition ${
                selected
                  ? "border-eid-action-500/70 bg-eid-action-500/12"
                  : "border-[color:var(--eid-border-subtle)] bg-eid-surface/45 hover:border-eid-primary-500/45"
              }`}
              aria-pressed={selected}
            >
              <span className="block text-xs font-bold text-eid-fg">{title}</span>
              <span className="mt-1 block text-[11px] leading-relaxed text-eid-text-secondary">{text}</span>
            </button>
          );
        })}
      </div>
      <p className="rounded-xl border border-eid-primary-500/25 bg-eid-primary-500/8 p-3 text-xs leading-relaxed text-eid-text-secondary">
        {modoIntegracao === "criar_nova"
          ? "Se o Asaas pedir selfie, documento ou aceite sensível, o usuário finaliza no app ou site do Asaas e volta ao painel."
          : "Se a conexão exigir login, chave de API ou confirmação de segurança, o usuário finaliza no app ou site do Asaas."}
      </p>
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
        {pending ? "Salvando..." : "Preparar recebimentos"}
      </button>
      {state.message ? (
        <p className={`text-xs ${state.ok ? "text-eid-primary-300" : "text-red-300"}`}>{state.message}</p>
      ) : null}
    </form>
  );
}
