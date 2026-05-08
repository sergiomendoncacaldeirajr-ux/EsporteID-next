"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { Value } from "react-phone-number-input";
import { isPossiblePhoneNumber } from "react-phone-number-input";
import { saveWhatsappAction } from "@/app/editar/actions";
import "react-phone-number-input/style.css";

const PhoneInput = dynamic(() => import("react-phone-number-input"), {
  ssr: false,
  loading: () => <div className="h-10 w-full animate-pulse rounded-xl bg-eid-surface/50" />,
});

function maskPhone(raw: string): string {
  const clean = raw.replace(/\s/g, "");
  if (clean.length < 8) return clean;
  const startLen = Math.min(5, clean.length - 4);
  const start = clean.slice(0, startLen);
  const end = clean.slice(-4);
  const midLen = Math.max(0, clean.length - startLen - 4);
  return `${start} ${"•".repeat(midLen)} ${end}`;
}

type Props = { initialWhatsapp: string | null };

export function ProfileWhatsappEditor({ initialWhatsapp }: Props) {
  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState<Value | undefined>((initialWhatsapp as Value) ?? undefined);
  const [current, setCurrent] = useState(initialWhatsapp ?? "");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    const val = String(phone ?? "").trim();
    if (!val || !isPossiblePhoneNumber(val)) {
      setMessage("Número inválido. Inclua o código do país (ex.: +55 11 99999-9999).");
      return;
    }
    setPending(true);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.append("whatsapp", val);
      const res = await saveWhatsappAction(fd);
      if (!res.ok) {
        setMessage(res.message);
      } else {
        setCurrent(val);
        setEditing(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3500);
      }
    } finally {
      setPending(false);
    }
  }

  function handleCancel() {
    setEditing(false);
    setMessage(null);
    setPhone((current as Value) || undefined);
  }

  return (
    <div className="rounded-2xl border border-[rgba(16,185,129,0.15)] bg-[linear-gradient(145deg,color-mix(in_srgb,rgb(16,185,129)_4%,var(--eid-card)),var(--eid-card))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] sm:p-4">

      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#25D366]/12 shadow-[0_0_10px_-4px_rgba(37,211,102,0.35)]">
            {/* WhatsApp logo mark */}
            <svg viewBox="0 0 24 24" width={18} height={18} fill="#25D366" aria-hidden>
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.786 23.428l4.503-1.444A11.931 11.931 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.003-1.364l-.359-.213-3.72 1.196 1.197-3.641-.234-.374A9.818 9.818 0 0 1 12 2.182c5.424 0 9.818 4.394 9.818 9.818 0 5.424-4.394 9.818-9.818 9.818z" />
            </svg>
          </span>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.04em] text-[color:color-mix(in_srgb,rgb(16,185,129)_75%,var(--eid-fg)_25%)]">
              WhatsApp
            </p>
            <p className="text-[9px] text-eid-text-secondary">Canal de suporte da equipe EsporteID</p>
          </div>
        </div>

        {!editing && (
          <button
            type="button"
            onClick={() => { setEditing(true); setMessage(null); }}
            className="inline-flex min-h-[26px] items-center gap-1.5 rounded-full border border-[rgba(16,185,129,0.3)] bg-[rgba(16,185,129,0.1)] px-3 text-[8px] font-black uppercase tracking-[0.05em] text-[color:color-mix(in_srgb,rgb(16,185,129)_75%,var(--eid-fg)_25%)] transition hover:bg-[rgba(16,185,129,0.18)] hover:border-[rgba(16,185,129,0.45)]"
          >
            <svg viewBox="0 0 24 24" width={10} height={10} fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Alterar
          </button>
        )}
      </div>

      {/* Número atual (modo visualização) */}
      {!editing && (
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-[rgba(16,185,129,0.12)] bg-eid-card/55 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
          <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-[color:color-mix(in_srgb,rgb(16,185,129)_60%,var(--eid-fg)_40%)]" aria-hidden>
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className={`font-mono text-sm tracking-wide ${current ? "text-eid-fg" : "italic text-eid-text-secondary"}`}>
            {current ? maskPhone(current) : "Nenhum número cadastrado"}
          </span>
          {saved && (
            <span className="ml-auto inline-flex items-center gap-1 text-[9px] font-bold text-emerald-400">
              <svg viewBox="0 0 24 24" width={10} height={10} fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                <path d="m5 12 4 4 10-10" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Salvo!
            </span>
          )}
        </div>
      )}

      {/* Modo edição */}
      {editing && (
        <div className="mt-3 space-y-2.5">
          {message && (
            <p className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-[11px] leading-snug text-red-300">
              {message}
            </p>
          )}

          <div className="overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card px-3 py-0.5 [&_.PhoneInput]:flex [&_.PhoneInput]:h-11 [&_.PhoneInput]:w-full [&_.PhoneInput]:items-center [&_.PhoneInputInput]:flex-1 [&_.PhoneInputInput]:bg-transparent [&_.PhoneInputInput]:text-sm [&_.PhoneInputInput]:text-eid-fg [&_.PhoneInputInput]:outline-none [&_.PhoneInputInput]:placeholder:text-[#98A2B3] [&_.PhoneInputCountrySelect]:bg-eid-card [&_.PhoneInputCountrySelect]:text-eid-fg">
            <PhoneInput
              international
              defaultCountry="BR"
              value={phone}
              onChange={(v) => setPhone(v)}
              placeholder="+55 11 99999-9999"
              style={{
                "--PhoneInput-color--text": "var(--eid-fg)",
                "--PhoneInputCountrySelect-marginRight": "0.4rem",
              } as React.CSSProperties}
            />
          </div>

          <p className="text-[9px] text-eid-text-secondary">
            Selecione o país e informe o número completo com DDD.
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={pending}
              className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-[rgba(16,185,129,0.4)] bg-[linear-gradient(135deg,color-mix(in_srgb,rgb(16,185,129)_18%,var(--eid-card)),color-mix(in_srgb,rgb(16,185,129)_8%,var(--eid-card)))] text-[11px] font-black uppercase tracking-[0.04em] text-[color:color-mix(in_srgb,rgb(16,185,129)_85%,var(--eid-fg)_15%)] transition hover:brightness-105 disabled:opacity-60"
            >
              {pending ? (
                <>
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 animate-spin" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <circle cx="12" cy="12" r="8" className="opacity-25" />
                    <path d="M20 12a8 8 0 0 0-8-8" strokeLinecap="round" />
                  </svg>
                  Salvando…
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                    <path d="m5 12 4 4 10-10" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Salvar WhatsApp
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={pending}
              className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 px-4 text-[11px] font-bold text-eid-text-secondary transition hover:bg-eid-surface/60 disabled:opacity-60"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
