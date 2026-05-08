"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { EmailCorrectionInline } from "@/components/auth/email-correction-inline";
import { EMAIL_CODE_MESSAGES } from "@/lib/auth/messages";
import { useResendEmailCode } from "@/components/auth/use-resend-email-code";
import { LogoFull } from "@/components/brand/logo-full";
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
  const [correctedPendingEmail, setCorrectedPendingEmail] = useState<string | null>(null);
  const { resending, resend } = useResendEmailCode({ mode: "signup" });

  const displayError = bootstrapError ?? actionState.error ?? localError;
  const pendingConfirmationEmail = actionState.pendingConfirmationEmail;
  const pendingConfirmationEmailEffective = (
    correctedPendingEmail ?? pendingConfirmationEmail ?? email
  )
    .trim()
    .toLowerCase();
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

  const focusWithinBg = "focus-within:border-eid-primary-500/50 focus-within:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]";

  function inputGroupClass() {
    return `flex h-[50px] items-center rounded-[14px] border-[1.5px] border-[color:var(--eid-border-subtle)] px-[15px] transition`;
  }

  function inputGroupStyle(): React.CSSProperties {
    return { background: "var(--eid-field-bg)" };
  }

  async function handleResendConfirmation() {
    setLocalError(null);
    setInfo(null);
    const emailNorm = pendingConfirmationEmailEffective;
    if (!emailNorm) {
      setLocalError("Informe seu e-mail para reenviar o código.");
      return;
    }
    const result = await resend(emailNorm);
    if (!result.ok) {
      setLocalError(result.error ?? "Não foi possível reenviar.");
      return;
    }
    setInfo(result.message ?? EMAIL_CODE_MESSAGES.resendSuccessSignup);
    router.push(`/verificar-codigo?email=${encodeURIComponent(emailNorm)}`);
  }

  function applyPendingEmailEdit(normalized: string) {
    setLocalError(null);
    setCorrectedPendingEmail(normalized);
    setInfo(EMAIL_CODE_MESSAGES.correctedEmailSignup);
  }

  return (
    <main className="eid-auth-bg flex min-h-[100svh] w-full flex-1 flex-col items-center justify-center overflow-x-hidden px-4 py-[max(1.25rem,env(safe-area-inset-top,0px)+0.75rem)] text-eid-fg sm:px-6 sm:py-8">
      <div className="eid-native-auth-enter w-full max-w-[340px] pb-6">
        <Link
          href="/?home=1"
          className="mb-4 hidden max-w-none text-[13px] leading-snug text-eid-text-muted no-underline transition hover:text-eid-fg sm:inline-block"
        >
          ← Página institucional (melhor no computador)
        </Link>

        <LogoFull size="auth" className="mb-6 mt-2 sm:mb-7" />

        <div className="eid-auth-card p-5 sm:p-6">
          <div className="mb-5 flex flex-col items-center">
            <h2 className="text-[16px] font-black uppercase tracking-[0.1em] text-eid-fg">
              Acesse sua conta
            </h2>
            <p className="mt-1.5 text-center text-[12px] leading-snug text-eid-text-muted">
              Entre com seu e-mail e senha cadastrados.
            </p>
          </div>

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
              <div className="mb-4 overflow-hidden rounded-[16px] border border-eid-action-500/25 bg-[linear-gradient(160deg,color-mix(in_srgb,var(--eid-action-500)_8%,var(--eid-card)),color-mix(in_srgb,var(--eid-action-500)_4%,var(--eid-card))_60%,var(--eid-card))]">
                {/* Top strip */}
                <div className="flex items-center gap-2 border-b border-eid-action-500/15 bg-eid-action-500/8 px-3.5 py-2.5">
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-eid-action-500/20 text-eid-action-400">
                    <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </span>
                  <p className="text-[12px] font-bold text-eid-fg">Confirme seu e-mail para entrar</p>
                </div>

                {/* Body */}
                <div className="px-3.5 py-3">
                  {/* Email chip */}
                  <div className="mb-3 flex items-center justify-center gap-1.5 rounded-lg border border-[color:var(--eid-border-subtle)] bg-[color:var(--eid-field-bg)] px-3 py-2">
                    <svg viewBox="0 0 24 24" width={13} height={13} fill="currentColor" className="shrink-0 text-eid-action-400" aria-hidden>
                      <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                    </svg>
                    <span className="min-w-0 truncate text-[12px] font-semibold text-eid-fg">
                      {pendingConfirmationEmailEffective}
                    </span>
                  </div>

                  {/* Email correction */}
                  <div className="mb-3">
                    <EmailCorrectionInline
                      currentEmail={pendingConfirmationEmailEffective}
                      onApplyEmail={applyPendingEmailEdit}
                      inputId="pending-email-edit"
                      triggerLabel="Errou o e-mail? Corrigir"
                      triggerClassName="w-full text-center text-[11.5px] font-semibold text-eid-text-muted transition hover:text-eid-action-500"
                    />
                  </div>

                  {/* Resend button */}
                  <button
                    type="button"
                    onClick={handleResendConfirmation}
                    disabled={resending}
                    className="flex h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,color-mix(in_srgb,var(--eid-action-400)_65%,#fff_35%),var(--eid-action-500)_50%,var(--eid-action-600))] text-[12.5px] font-extrabold uppercase tracking-wide text-white shadow-[0_6px_18px_-8px_rgba(249,115,22,0.6)] transition hover:brightness-105 active:scale-[0.97] disabled:opacity-60 disabled:shadow-none"
                  >
                    {resending ? (
                      <>
                        <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden />
                        Reenviando...
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                          <path d="M22 2 11 13" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="m22 2-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Reenviar código
                      </>
                    )}
                  </button>

                  {/* Already have code */}
                  <Link
                    href={`/verificar-codigo?email=${encodeURIComponent(pendingConfirmationEmailEffective)}`}
                    className="mt-2.5 flex h-[38px] w-full items-center justify-center gap-1.5 rounded-xl border border-eid-action-500/30 text-[12px] font-semibold text-eid-action-400 transition hover:border-eid-action-500/55 hover:bg-eid-action-500/8 hover:text-eid-action-300"
                  >
                    <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
                    </svg>
                    Já tenho o código
                  </Link>
                </div>
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
              className="mt-3 flex h-[52px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-0 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--eid-action-400)_65%,#fff_35%),var(--eid-action-500)_50%,var(--eid-action-600))] text-[14px] font-extrabold uppercase tracking-wide text-white shadow-[0_8px_24px_-10px_rgba(249,115,22,0.65)] transition hover:brightness-105 hover:shadow-[0_12px_30px_-10px_rgba(249,115,22,0.75)] active:scale-[0.97] active:opacity-90 disabled:opacity-60"
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

            <p className="mt-4 text-center text-[12px] text-eid-text-muted">
              <Link
                href="/recuperar-senha"
                className="font-bold text-eid-text-secondary underline-offset-2 no-underline hover:text-eid-fg hover:underline"
              >
                Esqueci minha senha
              </Link>
            </p>

            <div className="mt-4 border-t border-[color:var(--eid-border-subtle)] pt-4">
              <Link
                href="/cadastro"
                className="flex h-[46px] w-full items-center justify-center rounded-xl border border-eid-primary-500/35 bg-eid-primary-500/10 text-[13px] font-bold text-eid-primary-300 transition hover:bg-eid-primary-500/18 hover:border-eid-primary-500/50"
              >
                Criar conta gratuita →
              </Link>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
