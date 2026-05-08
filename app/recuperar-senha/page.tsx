"use client";

import { useState } from "react";
import Link from "next/link";
import { LogoFull } from "@/components/brand/logo-full";
import { createClient } from "@/lib/supabase/client";
import { getRecoveryEmailRedirectTo } from "@/lib/auth/email-redirects";

const inputClass =
  "h-[48px] w-full rounded-xl border border-[color:var(--eid-border-subtle)] bg-[color:var(--eid-field-bg)] px-4 text-[14px] text-eid-fg placeholder:text-eid-text-muted/80 outline-none transition focus:border-eid-primary-500/50 focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]";
const primaryBtnClass =
  "mt-1 flex h-[52px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-0 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--eid-action-400)_65%,#fff_35%),var(--eid-action-500)_50%,var(--eid-action-600))] text-[13px] font-extrabold uppercase tracking-wide text-white shadow-[0_8px_24px_-10px_rgba(249,115,22,0.65)] transition hover:brightness-105 hover:shadow-[0_12px_30px_-10px_rgba(249,115,22,0.75)] active:scale-[0.97] active:opacity-90 disabled:cursor-not-allowed disabled:opacity-60";

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMsg(null);
    setLoading(true);
    const supabase = createClient();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: getRecoveryEmailRedirectTo(origin),
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setMsg("Se existir uma conta com este e-mail, enviamos um link e um código para redefinir a senha.");
  }

  return (
    <main className="eid-auth-bg flex min-h-[100svh] w-full flex-1 flex-col items-center justify-center overflow-x-hidden px-4 py-[max(1.25rem,env(safe-area-inset-top,0px)+0.75rem)] text-eid-fg sm:px-6 sm:py-8">
      <div className="eid-native-auth-enter w-full max-w-[340px] pb-6">
        <LogoFull className="mb-5 mt-1 flex justify-center" />

        <div className="eid-auth-card p-5 sm:p-6">
          <div className="mb-5 flex flex-col items-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,color-mix(in_srgb,var(--eid-action-500)_20%,var(--eid-card)),color-mix(in_srgb,var(--eid-action-500)_8%,var(--eid-card)))] shadow-[0_0_22px_-6px_rgba(249,115,22,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-eid-action-500/25">
              <svg viewBox="0 0 24 24" className="h-[22px] w-[22px] text-eid-action-400" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" strokeLinecap="round" />
              </svg>
            </span>
            <h1 className="mt-3 text-[15px] font-black uppercase tracking-[0.08em] text-eid-fg">Esqueci minha senha</h1>
            <p className="mt-1 text-center text-[12px] leading-snug text-eid-text-muted">
              Informe o e-mail — você receberá um link e um código de 6 dígitos.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <p className="rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </p>
            )}
            {msg && (
              <div className="rounded-xl border border-eid-primary-500/30 bg-eid-primary-500/10 px-3 py-2 text-sm text-eid-primary-300">
                <p>{msg}</p>
                <Link
                  href={`/verificar-codigo?tipo=recovery&email=${encodeURIComponent(email.trim().toLowerCase())}`}
                  className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border-2 border-eid-primary-500/40 bg-eid-card px-4 text-[13px] font-bold uppercase tracking-[0.02em] text-eid-fg transition hover:border-eid-primary-500/60 hover:bg-eid-surface"
                >
                  Já tenho o código
                </Link>
              </div>
            )}
            <div>
              <label htmlFor="rec-email" className="mb-1 block text-sm font-medium text-eid-fg">
                E-mail
              </label>
              <input
                id="rec-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>
            <button type="submit" disabled={loading} className={primaryBtnClass}>
              {loading ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden />
                  <span className="!text-[12px] font-extrabold uppercase tracking-[0.02em]">Enviando código...</span>
                </>
              ) : (
                <span className="!text-[12px] font-extrabold uppercase tracking-[0.02em]">Enviar link e código</span>
              )}
            </button>
          </form>
          <Link
            href="/login"
            className="mt-4 flex h-[40px] w-full items-center justify-center rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 text-[12px] font-semibold text-eid-text-secondary transition hover:bg-eid-surface/60 hover:text-eid-fg"
          >
            ← Voltar ao login
          </Link>
        </div>
      </div>
    </main>
  );
}
