"use client";

import { useActionState } from "react";
import type { FormEvent, ReactNode } from "react";
import { CreditCard, MapPin, ShieldCheck, UserRound } from "lucide-react";
import {
  gerarCobrancaMensalidadePlataformaEspacoAction,
  solicitarCancelamentoAssinaturaPlataformaEspacoAction,
} from "@/app/espaco/actions";

function Field({
  label,
  children,
  hint,
  wide = false,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  wide?: boolean;
}) {
  return (
    <label className={`block text-[12px] font-bold text-eid-text-secondary ${wide ? "sm:col-span-2" : ""}`}>
      {label}
      <div className="mt-1.5">{children}</div>
      {hint ? <span className="mt-1 block text-[11px] font-medium leading-relaxed text-eid-text-secondary/85">{hint}</span> : null}
    </label>
  );
}

const inputClass = "eid-input-dark min-h-12 w-full rounded-xl px-3.5 py-3 text-[16px] leading-normal text-eid-fg placeholder:text-eid-text-secondary/65 sm:text-sm";

function digitsOnly(value: string, max: number) {
  return value.replace(/\D/g, "").slice(0, max);
}

function groupDigits(value: string, groupSize = 4) {
  return value.match(new RegExp(`.{1,${groupSize}}`, "g"))?.join(" ") ?? value;
}

function formatCpfCnpj(value: string) {
  const digits = digitsOnly(value, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2");
  }
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function formatCep(value: string) {
  return digitsOnly(value, 8).replace(/^(\d{5})(\d)/, "$1-$2");
}

function formatPhone(value: string) {
  const digits = digitsOnly(value, 11);
  if (digits.length <= 10) {
    return digits.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  }
  return digits.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}

function applyMask(
  event: FormEvent<HTMLInputElement>,
  maxDigits: number,
  formatter: (digits: string) => string = (digits) => digits
) {
  event.currentTarget.value = formatter(digitsOnly(event.currentTarget.value, maxDigits));
}

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
          <div className="rounded-xl border border-eid-primary-500/25 bg-eid-primary-500/8 p-3 text-[11px] leading-relaxed text-eid-text-secondary">
            Digite somente os dados do titular do cartão. Nós formatamos os números para evitar erro; o Asaas recebe apenas os dígitos necessários para validar a recorrência.
          </div>

          <section className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-black text-eid-fg">
              <CreditCard className="h-4 w-4 text-eid-primary-300" aria-hidden />
              Cartão
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nome impresso no cartão" hint="Use exatamente como aparece no cartão." wide>
                <input name="card_holder_name" autoComplete="cc-name" className={inputClass} placeholder="NOME SOBRENOME" minLength={3} required />
              </Field>
              <Field label="Número do cartão" hint="13 a 19 dígitos. O campo agrupa de 4 em 4 automaticamente." wide>
                <input
                  name="card_number"
                  inputMode="numeric"
                  autoComplete="cc-number"
                  className={inputClass}
                  placeholder="0000 0000 0000 0000"
                  minLength={16}
                  maxLength={23}
                  pattern="[0-9 ]{16,23}"
                  onInput={(event) => applyMask(event, 19, (digits) => groupDigits(digits))}
                  required
                />
              </Field>
              <Field label="Mês" hint="2 dígitos: 01 a 12.">
                <input
                  name="card_expiry_month"
                  inputMode="numeric"
                  autoComplete="cc-exp-month"
                  className={inputClass}
                  placeholder="MM"
                  maxLength={2}
                  pattern="0[1-9]|1[0-2]"
                  onInput={(event) => applyMask(event, 2)}
                  required
                />
              </Field>
              <Field label="Ano" hint="4 dígitos. Ex.: 2029.">
                <input
                  name="card_expiry_year"
                  inputMode="numeric"
                  autoComplete="cc-exp-year"
                  className={inputClass}
                  placeholder="AAAA"
                  minLength={4}
                  maxLength={4}
                  pattern="[0-9]{4}"
                  onInput={(event) => applyMask(event, 4)}
                  required
                />
              </Field>
              <Field label="CVV" hint="3 ou 4 dígitos no verso/frente do cartão.">
                <input
                  name="card_ccv"
                  inputMode="numeric"
                  autoComplete="cc-csc"
                  className={inputClass}
                  placeholder="123"
                  minLength={3}
                  maxLength={4}
                  pattern="[0-9]{3,4}"
                  onInput={(event) => applyMask(event, 4)}
                  required
                />
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
              <Field label="CPF/CNPJ do titular" hint="CPF com 11 dígitos ou CNPJ com 14 dígitos.">
                <input
                  name="holder_cpf_cnpj"
                  inputMode="numeric"
                  className={inputClass}
                  placeholder="000.000.000-00"
                  minLength={14}
                  maxLength={18}
                  onInput={(event) => {
                    event.currentTarget.value = formatCpfCnpj(event.currentTarget.value);
                  }}
                  required
                />
              </Field>
              <Field label="E-mail do titular">
                <input name="holder_email" type="email" autoComplete="email" className={inputClass} placeholder="email@exemplo.com" required />
              </Field>
              <Field label="WhatsApp/telefone" hint="DDD + número. Use 10 ou 11 dígitos." wide>
                <input
                  name="holder_phone"
                  inputMode="tel"
                  autoComplete="tel"
                  className={inputClass}
                  placeholder="(00) 00000-0000"
                  minLength={14}
                  maxLength={15}
                  onInput={(event) => {
                    event.currentTarget.value = formatPhone(event.currentTarget.value);
                  }}
                  required
                />
              </Field>
            </div>
          </section>

          <section className="space-y-3 border-t border-[color:var(--eid-border-subtle)] pt-5">
            <div className="flex items-center gap-2 text-sm font-black text-eid-fg">
              <MapPin className="h-4 w-4 text-eid-primary-300" aria-hidden />
              Endereço de cobrança
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="CEP" hint="8 dígitos.">
                <input
                  name="holder_postal_code"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  className={inputClass}
                  placeholder="00000-000"
                  minLength={9}
                  maxLength={9}
                  pattern="[0-9]{5}-[0-9]{3}"
                  onInput={(event) => {
                    event.currentTarget.value = formatCep(event.currentTarget.value);
                  }}
                  required
                />
              </Field>
              <Field label="Número do endereço" hint="Somente número do imóvel.">
                <input
                  name="holder_address_number"
                  inputMode="numeric"
                  autoComplete="address-line2"
                  className={inputClass}
                  placeholder="123"
                  maxLength={8}
                  onInput={(event) => applyMask(event, 8)}
                  required
                />
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
