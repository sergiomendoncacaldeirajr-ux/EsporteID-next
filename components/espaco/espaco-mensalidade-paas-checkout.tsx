"use client";

import { useActionState } from "react";
import {
  gerarCobrancaMensalidadePlataformaEspacoAction,
  solicitarCancelamentoAssinaturaPlataformaEspacoAction,
} from "@/app/espaco/actions";

export function EspacoMensalidadePaasCheckout({ espacoId }: { espacoId: number }) {
  const [state, formAction, pending] = useActionState(gerarCobrancaMensalidadePlataformaEspacoAction, null);
  return (
    <div className="mt-3 space-y-3">
      <form action={formAction} className="rounded-2xl border border-eid-primary-500/20 bg-eid-primary-500/[0.04] p-4">
        <input type="hidden" name="espaco_id" value={espacoId} />
        <div className="mb-4">
          <p className="text-sm font-black text-eid-fg">Checkout transparente no cartão</p>
          <p className="mt-1 text-xs text-eid-text-secondary">
            A mensalidade da plataforma é validada diretamente no Asaas. O cartão não fica salvo no EsporteID.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-eid-text-secondary sm:col-span-2">
            Nome impresso no cartão
            <input name="card_holder_name" autoComplete="cc-name" className="eid-input-dark mt-1 w-full rounded-xl px-3 py-2 text-sm" placeholder="Nome do titular" required />
          </label>
          <label className="text-xs font-semibold text-eid-text-secondary sm:col-span-2">
            Número do cartão
            <input name="card_number" inputMode="numeric" autoComplete="cc-number" className="eid-input-dark mt-1 w-full rounded-xl px-3 py-2 text-sm" placeholder="0000 0000 0000 0000" required />
          </label>
          <label className="text-xs font-semibold text-eid-text-secondary">
            Mês
            <input name="card_expiry_month" inputMode="numeric" autoComplete="cc-exp-month" className="eid-input-dark mt-1 w-full rounded-xl px-3 py-2 text-sm" placeholder="MM" maxLength={2} required />
          </label>
          <label className="text-xs font-semibold text-eid-text-secondary">
            Ano
            <input name="card_expiry_year" inputMode="numeric" autoComplete="cc-exp-year" className="eid-input-dark mt-1 w-full rounded-xl px-3 py-2 text-sm" placeholder="AAAA" maxLength={4} required />
          </label>
          <label className="text-xs font-semibold text-eid-text-secondary">
            CVV
            <input name="card_ccv" inputMode="numeric" autoComplete="cc-csc" className="eid-input-dark mt-1 w-full rounded-xl px-3 py-2 text-sm" placeholder="123" maxLength={4} required />
          </label>
          <label className="text-xs font-semibold text-eid-text-secondary">
            CPF/CNPJ do titular
            <input name="holder_cpf_cnpj" inputMode="numeric" className="eid-input-dark mt-1 w-full rounded-xl px-3 py-2 text-sm" placeholder="000.000.000-00" required />
          </label>
          <label className="text-xs font-semibold text-eid-text-secondary">
            E-mail do titular
            <input name="holder_email" type="email" autoComplete="email" className="eid-input-dark mt-1 w-full rounded-xl px-3 py-2 text-sm" placeholder="email@exemplo.com" required />
          </label>
          <label className="text-xs font-semibold text-eid-text-secondary">
            WhatsApp/telefone
            <input name="holder_phone" inputMode="tel" autoComplete="tel" className="eid-input-dark mt-1 w-full rounded-xl px-3 py-2 text-sm" placeholder="(00) 00000-0000" required />
          </label>
          <label className="text-xs font-semibold text-eid-text-secondary">
            CEP
            <input name="holder_postal_code" inputMode="numeric" autoComplete="postal-code" className="eid-input-dark mt-1 w-full rounded-xl px-3 py-2 text-sm" placeholder="00000-000" required />
          </label>
          <label className="text-xs font-semibold text-eid-text-secondary">
            Número do endereço
            <input name="holder_address_number" autoComplete="address-line2" className="eid-input-dark mt-1 w-full rounded-xl px-3 py-2 text-sm" placeholder="123" required />
          </label>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="eid-btn-primary mt-4 w-full rounded-xl px-4 py-3 text-sm font-bold sm:w-auto"
        >
          {pending ? "Validando cartão..." : "Validar cartão e ativar recorrência"}
        </button>
      </form>
      <form action={solicitarCancelamentoAssinaturaPlataformaEspacoAction}>
        <input type="hidden" name="espaco_id" value={espacoId} />
        <button
          type="submit"
          className="w-full rounded-xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300 sm:w-auto"
        >
          Solicitar cancelamento (após 3 meses)
        </button>
      </form>
      {state != null && state.message ? (
        <p className={`text-xs ${state.ok ? "text-eid-primary-300" : "text-red-300"}`}>{state.message}</p>
      ) : null}
      <p className="text-[11px] text-eid-text-secondary">
        A mensalidade PaaS agora aceita somente cartão de crédito, com primeiro mês gratuito e recorrência automática no mês seguinte.
      </p>
    </div>
  );
}
