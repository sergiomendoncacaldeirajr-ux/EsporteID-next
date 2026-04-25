"use client";

import { useState } from "react";
import Link from "next/link";
import { LogoFull } from "@/components/brand/logo-full";
import { createClient } from "@/lib/supabase/client";
import { getRecoveryEmailRedirectTo } from "@/lib/auth/email-redirects";

const inputClass =
  "eid-input-dark w-full rounded-xl px-3 py-3 text-eid-fg placeholder:text-eid-text-secondary/85";
const primaryBtnClass =
  "eid-btn-primary flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl px-3 text-[14px] font-bold transition hover:shadow-[0_8px_18px_-10px_rgba(249,115,22,0.7)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60";

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

        <div className="eid-auth-card mt-6 p-5">
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
                  className="mt-2 inline-block font-semibold text-eid-action-500 hover:text-eid-action-400"
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
                  <span>Enviando código...</span>
                </>
              ) : (
                "Enviar link e código"
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
