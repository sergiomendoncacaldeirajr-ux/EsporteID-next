"use client";

import { useState } from "react";
import Link from "next/link";
import { LogoFull } from "@/components/brand/logo-full";
import { createClient } from "@/lib/supabase/client";
import { getRecoveryEmailRedirectTo } from "@/lib/auth/email-redirects";

const inputClass =
  "eid-input-dark h-[32px] w-full rounded-xl px-3 py-1.5 text-eid-fg placeholder:text-eid-text-secondary/85";
const primaryBtnClass =
  "mt-2 flex h-[46px] w-full cursor-pointer items-center justify-center rounded-xl border-0 bg-eid-action-500 !text-[12px] font-extrabold uppercase tracking-[0.02em] text-white transition hover:bg-eid-action-400 active:scale-[0.97] active:bg-eid-action-600 active:opacity-95 disabled:cursor-not-allowed disabled:opacity-60";

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
    <main className="eid-auth-bg flex w-full flex-1 flex-col items-center overflow-x-hidden px-4 pb-28 pt-14 text-eid-fg sm:px-6 sm:pt-7">
      <div className="w-full max-w-[340px] pb-6">
        <LogoFull className="mb-5 mt-1 flex justify-center" />
        <Link
          href="/login"
          className="mb-4 inline-block text-[13px] text-eid-text-muted no-underline transition hover:text-eid-fg"
        >
          ← Voltar ao login
        </Link>
        <h1 className="text-xl font-bold tracking-tight text-eid-fg sm:text-2xl">Esqueci minha senha</h1>
        <p className="mt-2 text-sm leading-relaxed text-eid-text-secondary">
          Informe o e-mail da conta. Você receberá um link e também poderá usar código de 6 dígitos.
        </p>

        <div className="eid-auth-card mt-6 p-2.5">
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
        </div>
      </div>
    </main>
  );
}
