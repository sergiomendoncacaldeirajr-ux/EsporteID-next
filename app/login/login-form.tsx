"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { LogoFull } from "@/components/brand/logo-full";
import { createClient } from "@/lib/supabase/client";
import { getSignupEmailRedirectTo } from "@/lib/auth/email-redirects";
import { getPostAuthRedirect } from "@/lib/auth/post-login-path";

function IconEnvelope({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width={20} height={20} aria-hidden>
      <path
        fill="currentColor"
        d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"
      />
    </svg>
  );
}

function IconLock({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width={20} height={20} aria-hidden>
      <path
        fill="currentColor"
        d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"
      />
    </svg>
  );
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
  const registered = searchParams.get("cadastro") === "ok";
  const codeConfirmed = searchParams.get("codigo") === "ok";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pendingConfirmationEmail, setPendingConfirmationEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const focusWithinBg = "focus-within:bg-eid-card";

  function inputGroupClass() {
    return `eid-focus-ring flex h-[46px] items-center rounded-[14px] border-[1.5px] border-transparent px-[15px] transition`;
  }

  function inputGroupStyle(): React.CSSProperties {
    return { background: "var(--eid-field-bg)" };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setPendingConfirmationEmail(null);

    const emailNorm = email.trim().toLowerCase();
    if (!emailNorm) {
      setError("Informe seu e-mail.");
      return;
    }
    if (!password) {
      setError("Informe sua senha.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
      setError("Digite um e-mail válido.");
      return;
    }

    setLoading(true);
    try {
      let supabase;
      try {
        supabase = createClient();
      } catch (cfgErr) {
        setError(cfgErr instanceof Error ? cfgErr.message : "Erro de configuração do aplicativo.");
        return;
      }

      const TIMEOUT_MS = 35_000;
      const signInResult = await Promise.race([
        supabase.auth.signInWithPassword({
          email: emailNorm,
          password,
        }),
        new Promise<{ data: null; error: { message: string } }>((resolve) =>
          setTimeout(
            () =>
              resolve({
                data: null,
                error: { message: "__LOGIN_TIMEOUT__" },
              }),
            TIMEOUT_MS
          )
        ),
      ]);

      const err = signInResult.error;
      if (err?.message === "__LOGIN_TIMEOUT__") {
        setError("A conexão demorou demais. Verifique a internet e tente de novo.");
        return;
      }
      if (err) {
        const msg = (err.message ?? "").toLowerCase();
        if (msg.includes("email not confirmed")) {
          setPendingConfirmationEmail(emailNorm);
          setError("Seu e-mail ainda não foi confirmado.");
          return;
        }
        setError(
          err.message === "Invalid login credentials"
            ? "E-mail ou senha incorretos."
            : err.message
        );
        return;
      }

      const session = signInResult.data?.session;
      if (!session?.user) {
        setError(
          "A sessão não foi criada no navegador. Tente limpar os dados do site para este domínio e entrar de novo."
        );
        return;
      }

      const u = session.user;
      const PROFILE_MS = 12_000;
      const profileRace = await Promise.race([
        supabase
          .from("profiles")
          .select("termos_aceitos_em, perfil_completo")
          .eq("id", u.id)
          .maybeSingle()
          .then((r) => ({ kind: "ok" as const, r })),
        new Promise<{ kind: "timeout" }>((resolve) =>
          setTimeout(() => resolve({ kind: "timeout" }), PROFILE_MS)
        ),
      ]);

      let dest: string;
      if (profileRace.kind === "timeout") {
        dest = "/dashboard";
      } else {
        const profile = profileRace.r.data;
        dest = getPostAuthRedirect(
          {
            termosAceitos: !!profile?.termos_aceitos_em,
            perfilCompleto: !!profile?.perfil_completo,
          },
          next
        );
      }

      window.location.assign(dest);
    } catch (unknown) {
      const msg =
        unknown instanceof Error ? unknown.message : "Não foi possível entrar. Tente novamente.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleResendConfirmation() {
    setError(null);
    setInfo(null);
    const emailNorm = (pendingConfirmationEmail ?? email).trim().toLowerCase();
    if (!emailNorm) {
      setError("Informe seu e-mail para reenviar o código.");
      return;
    }

    setResending(true);
    try {
      const supabase = createClient();
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { error: resendErr } = await supabase.auth.resend({
        type: "signup",
        email: emailNorm,
        options: {
          ...(origin
            ? {
                emailRedirectTo: getSignupEmailRedirectTo(origin),
              }
            : {}),
        },
      });

      if (resendErr) {
        setError(resendErr.message);
        return;
      }
      setInfo("Código de confirmação reenviado. Verifique seu e-mail.");
      router.push(`/verificar-codigo?email=${encodeURIComponent(emailNorm)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível reenviar. Tente de novo.");
    } finally {
      setResending(false);
    }
  }

  return (
    <main className="eid-auth-bg flex w-full flex-1 flex-col items-center overflow-x-hidden px-4 pb-28 pt-14 text-eid-fg sm:px-6 sm:pt-7">
      <div className="w-full max-w-[340px] pb-6">
        <Link
          href="/?home=1"
          className="mb-3 inline-block max-w-[calc(100%-5.5rem)] text-[13px] leading-snug text-eid-text-muted no-underline transition hover:text-eid-fg sm:max-w-none"
        >
          <span className="sm:hidden">← Início (site)</span>
          <span className="hidden sm:inline">← Página institucional (melhor no computador)</span>
        </Link>

        <LogoFull priority className="mb-5 mt-1" />

        <div className="eid-auth-card p-5">
          <h2 className="mb-[15px] mt-0 text-center text-[14px] font-extrabold uppercase tracking-[1px] text-eid-primary-500">
            Entrar
          </h2>
          <p className="-mt-2 mb-4 text-center text-[12px] leading-snug text-eid-text-muted">
            Use o mesmo e-mail e senha do seu cadastro.
          </p>

          <form noValidate onSubmit={handleSubmit} className="m-0 flex flex-col gap-0">
            {registered && (
              <p
                className="mb-[15px] rounded-xl border border-eid-primary-500/30 bg-eid-primary-500/10 px-2.5 py-2.5 text-center text-[12px] text-eid-primary-300"
              >
                Conta criada. Faça login com seu e-mail e senha.
              </p>
            )}
            {codeConfirmed && (
              <p
                className="mb-[15px] rounded-xl border border-eid-primary-500/30 bg-eid-primary-500/10 px-2.5 py-2.5 text-center text-[12px] text-eid-primary-300"
              >
                E-mail confirmado com sucesso. Faça login para continuar.
              </p>
            )}
            {error && (
              <p
                className="mb-[15px] rounded-xl border border-[rgba(255,107,107,0.2)] bg-[rgba(255,107,107,0.1)] px-2.5 py-2.5 text-center text-[12px] text-[#ff6b6b]"
                role="alert"
              >
                {error}
              </p>
            )}
            {info && (
              <p className="mb-[15px] rounded-xl border border-eid-primary-500/30 bg-eid-primary-500/10 px-2.5 py-2.5 text-center text-[12px] text-eid-primary-300">
                {info}
              </p>
            )}
            {pendingConfirmationEmail ? (
              <div className="mb-[15px] rounded-xl border border-eid-action-500/30 bg-eid-action-500/10 px-3 py-2.5 text-center text-[12px] text-eid-fg">
                <p className="mb-2">Confirme seu e-mail para continuar.</p>
                <button
                  type="button"
                  onClick={handleResendConfirmation}
                  disabled={resending}
                  className="w-full rounded-lg bg-eid-action-500 px-3 py-2 text-[12px] font-bold text-white transition hover:bg-eid-action-400 disabled:opacity-60"
                >
                  {resending ? "Reenviando código..." : "Reenviar código de confirmação"}
                </button>
                <Link
                  href={`/verificar-codigo?email=${encodeURIComponent(pendingConfirmationEmail)}`}
                  className="mt-2 inline-block font-semibold text-eid-action-500 hover:text-eid-action-400"
                >
                  Já tenho o código
                </Link>
              </div>
            ) : null}

            <div
              className={`${inputGroupClass()} mb-2 text-eid-fg ${focusWithinBg}`}
              style={inputGroupStyle()}
            >
              <span className="text-eid-primary-500">
                <IconEnvelope />
              </span>
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="min-w-0 flex-1 border-0 bg-transparent pl-2.5 text-[15px] text-eid-fg outline-none placeholder:text-eid-text-muted/90"
              />
            </div>

            <div
              className={`${inputGroupClass()} mb-2 text-eid-fg ${focusWithinBg}`}
              style={inputGroupStyle()}
            >
              <span className="text-eid-primary-500">
                <IconLock />
              </span>
              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="min-w-0 flex-1 border-0 bg-transparent pl-2.5 text-[15px] text-eid-fg outline-none placeholder:text-eid-text-muted/90"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex h-[50px] w-full cursor-pointer items-center justify-center rounded-xl border-0 bg-eid-action-500 text-[14px] font-extrabold uppercase text-white transition hover:bg-eid-action-400 active:scale-[0.97] active:bg-eid-action-600 active:opacity-95 disabled:opacity-60"
            >
              {loading ? (
                <span
                  className="inline-block h-5 w-5 animate-spin rounded-full border-[3px] border-white border-t-transparent"
                  aria-hidden
                />
              ) : (
                <span>Entrar</span>
              )}
            </button>

            <p className="mt-[15px] text-center text-[13px] text-eid-text-muted">
              <Link
                href="/recuperar-senha"
                className="font-bold text-eid-action-500 no-underline hover:text-eid-action-400"
              >
                Esqueci minha senha
              </Link>
            </p>

            <p className="mt-2 text-center text-[13px] text-eid-text-muted">
              Não tem conta?{" "}
              <Link href="/cadastro" className="font-bold text-eid-action-500 no-underline hover:text-eid-action-400">
                Criar conta
              </Link>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
