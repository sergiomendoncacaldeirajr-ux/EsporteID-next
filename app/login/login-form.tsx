"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { LogoFull } from "@/components/brand/logo-full";
import { createClient } from "@/lib/supabase/client";
import { getSignupEmailRedirectTo } from "@/lib/auth/email-redirects";
import { entrarComSenha } from "@/app/login/actions";
import { loginActionInitial } from "@/app/login/login-state";

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

function IconEye({ slash }: { slash?: boolean }) {
  if (slash) {
    return (
      <svg viewBox="0 0 24 24" width={16} height={16} aria-hidden>
        <path
          fill="currentColor"
          d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} aria-hidden>
      <path
        fill="currentColor"
        d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
      />
    </svg>
  );
}

type LoginFormProps = {
  nextPath: string;
  cadastroOk: boolean;
  codigoOk: boolean;
  /** Falha ao criar cliente Supabase / ler sessão no servidor (RSC). */
  bootstrapError?: string | null;
};

function friendlyActionError(raw: string): string {
  const m = raw.trim();
  if (
    m.includes("Server Components") ||
    m.includes("An error occurred") ||
    m.toLowerCase().includes("digest")
  ) {
    return "Falha ao comunicar com o servidor. Atualize a página e tente novamente.";
  }
  return m;
}

export function LoginForm({ nextPath, cadastroOk, codigoOk, bootstrapError = null }: LoginFormProps) {
  const router = useRouter();
  const next = nextPath || "/";
  const registered = cadastroOk;
  const codeConfirmed = codigoOk;

  const [actionState, setActionState] = useState(loginActionInitial);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  const displayError = bootstrapError ?? actionState.error ?? localError;
  const pendingConfirmationEmail = actionState.pendingConfirmationEmail;

  const handleLoginSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setLocalError(null);
      setIsSubmitting(true);
      try {
        const fd = new FormData(e.currentTarget);
        const result = await entrarComSenha(fd);
        if (result.redirectTo) {
          window.location.assign(result.redirectTo);
          return;
        }
        setActionState(result);
      } catch (err) {
        const raw = err instanceof Error ? err.message : "Não foi possível entrar. Tente de novo.";
        setLocalError(friendlyActionError(raw));
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  const focusWithinBg = "focus-within:bg-eid-card";

  function inputGroupClass() {
    return `eid-focus-ring flex h-[46px] items-center rounded-[14px] border-[1.5px] border-transparent px-[15px] transition`;
  }

  function inputGroupStyle(): React.CSSProperties {
    return { background: "var(--eid-field-bg)" };
  }

  async function handleResendConfirmation() {
    setLocalError(null);
    setInfo(null);
    const emailNorm = (pendingConfirmationEmail ?? email).trim().toLowerCase();
    if (!emailNorm) {
      setLocalError("Informe seu e-mail para reenviar o código.");
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
        setLocalError(resendErr.message);
        return;
      }
      setInfo("Código de confirmação reenviado. Verifique seu e-mail.");
      router.push(`/verificar-codigo?email=${encodeURIComponent(emailNorm)}`);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Não foi possível reenviar. Tente de novo.");
    } finally {
      setResending(false);
    }
  }

  return (
    <main className="eid-auth-bg flex w-full flex-1 flex-col items-center overflow-x-hidden px-4 pb-28 pt-[max(3.25rem,env(safe-area-inset-top,0px)+1.75rem)] text-eid-fg sm:px-6 sm:pb-32 sm:pt-16 md:pt-20">
      <div className="w-full max-w-[340px] pb-6">
        <Link
          href="/?home=1"
          className="mb-4 hidden max-w-none text-[13px] leading-snug text-eid-text-muted no-underline transition hover:text-eid-fg sm:inline-block"
        >
          ← Página institucional (melhor no computador)
        </Link>

        <LogoFull size="auth" className="mb-6 mt-2 sm:mb-7" />

        <div className="eid-auth-card p-5">
          <h2 className="mb-[15px] mt-0 text-center text-[14px] font-extrabold uppercase tracking-[1px] text-eid-primary-500">
            Entrar
          </h2>
          <p className="-mt-2 mb-4 text-center text-[12px] leading-snug text-eid-text-muted">
            Use o mesmo e-mail e senha do seu cadastro.
          </p>

          <form onSubmit={handleLoginSubmit} noValidate className="m-0 flex flex-col gap-0">
            <input type="hidden" name="next" value={next} />
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
            {displayError && (
              <p
                className="mb-[15px] rounded-xl border border-[rgba(255,107,107,0.2)] bg-[rgba(255,107,107,0.1)] px-2.5 py-2.5 text-center text-[12px] text-[#ff6b6b]"
                role="alert"
              >
                {displayError}
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
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="min-w-0 flex-1 border-0 bg-transparent pl-2.5 text-[15px] text-eid-fg outline-none placeholder:text-eid-text-muted/90"
              />
              <button
                type="button"
                className="cursor-pointer border-0 bg-transparent p-2.5 text-eid-text-secondary"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                <IconEye slash={showPassword} />
              </button>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || Boolean(bootstrapError)}
              className="mt-2 flex h-[50px] w-full cursor-pointer items-center justify-center rounded-xl border-0 bg-eid-action-500 text-[14px] font-extrabold uppercase text-white transition hover:bg-eid-action-400 active:scale-[0.97] active:bg-eid-action-600 active:opacity-95 disabled:opacity-60"
            >
              {isSubmitting ? (
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
