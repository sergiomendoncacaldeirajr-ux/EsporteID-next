"use client";

import { useActionState } from "react";
import { CreditCard, MapPin, ShieldCheck, UserRound } from "lucide-react";
import {
  gerarCobrancaMensalidadePlataformaEspacoAction,
  solicitarCancelamentoAssinaturaPlataformaEspacoAction,
} from "@/app/espaco/actions";

function Field({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={`block text-[12px] font-bold text-eid-text-secondary ${wide ? "sm:col-span-2" : ""}`}>
      {label}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

const inputClass = "eid-input-dark min-h-12 w-full rounded-xl px-3.5 py-3 text-[16px] leading-normal text-eid-fg placeholder:text-eid-text-secondary/65 sm:text-sm";

export function EspacoMensalidadePaasCheckout({ espacoId }: { espacoId: number }) {
  const [state, formAction, pending] = useActionState(gerarCobrancaMensalidadePlataformaEspacoAction, null);
  return (
    <div className="mt-4 space-y-3">
      <form action={formAction} className="overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90">
        <input type="hidden" name="espaco_id" value={espacoId} />
        <div className="border-b border-[color:var(--eid-border-subtle)] bg-eid-primary-500/8 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-eid-primary-500/30 bg-eid-primary-500/12 text-eid-primary-300">
              <ShieldCheck className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-base font-black text-eid-fg">Ativar recorrência no cartão</p>
              <p className="mt-1 text-sm leading-relaxed text-eid-text-secondary">
                Validação segura pelo Asaas. O cartão não fica salvo no EsporteID.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-4 sm:p-5">
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-black text-eid-fg">
              <CreditCard className="h-4 w-4 text-eid-primary-300" aria-hidden />
              Cartão
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nome impresso no cartão" wide>
                <input name="card_holder_name" autoComplete="cc-name" className={inputClass} placeholder="Nome do titular" required />
              </Field>
              <Field label="Número do cartão" wide>
                <input name="card_number" inputMode="numeric" autoComplete="cc-number" className={inputClass} placeholder="0000 0000 0000 0000" required />
              </Field>
              <Field label="Mês">
                <input name="card_expiry_month" inputMode="numeric" autoComplete="cc-exp-month" className={inputClass} placeholder="MM" maxLength={2} required />
              </Field>
              <Field label="Ano">
                <input name="card_expiry_year" inputMode="numeric" autoComplete="cc-exp-year" className={inputClass} placeholder="AAAA" maxLength={4} required />
              </Field>
              <Field label="CVV">
                <input name="card_ccv" inputMode="numeric" autoComplete="cc-csc" className={inputClass} placeholder="123" maxLength={4} required />
              </Field>
              <div className="hidden sm:block" aria-hidden />
            </div>
          </section>

          <section className="space-y-3 border-t border-[color:var(--eid-border-subtle)] pt-5">
            <div className="flex items-center gap-2 text-sm font-black text-eid-fg">
              <UserRound className="h-4 w-4 text-eid-primary-300" aria-hidden />
              Titular
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="CPF/CNPJ do titular">
                <input name="holder_cpf_cnpj" inputMode="numeric" className={inputClass} placeholder="000.000.000-00" required />
              </Field>
              <Field label="E-mail do titular">
                <input name="holder_email" type="email" autoComplete="email" className={inputClass} placeholder="email@exemplo.com" required />
              </Field>
              <Field label="WhatsApp/telefone" wide>
                <input name="holder_phone" inputMode="tel" autoComplete="tel" className={inputClass} placeholder="(00) 00000-0000" required />
              </Field>
            </div>
          </section>

          <section className="space-y-3 border-t border-[color:var(--eid-border-subtle)] pt-5">
            <div className="flex items-center gap-2 text-sm font-black text-eid-fg">
              <MapPin className="h-4 w-4 text-eid-primary-300" aria-hidden />
              Endereço de cobrança
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="CEP">
                <input name="holder_postal_code" inputMode="numeric" autoComplete="postal-code" className={inputClass} placeholder="00000-000" required />
              </Field>
              <Field label="Número do endereço">
                <input name="holder_address_number" autoComplete="address-line2" className={inputClass} placeholder="123" required />
              </Field>
            </div>
          </section>

          <button
            type="submit"
            disabled={pending}
            className="eid-btn-primary min-h-12 w-full rounded-xl px-4 py-3 text-sm font-black"
          >
            {pending ? "Validando cartão..." : "Validar cartão e ativar recorrência"}
          </button>

          <p className="text-[11px] leading-relaxed text-eid-text-secondary">
            A mensalidade PaaS aceita cartão de crédito, com primeiro mês gratuito e recorrência automática no mês seguinte.
          </p>
        </div>
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
    </div>
  );
}
