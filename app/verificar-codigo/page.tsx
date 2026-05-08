"use client";

import Link from "next/link";
import { Suspense, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useResendEmailCode } from "@/components/auth/use-resend-email-code";
import { LogoFull } from "@/components/brand/logo-full";
import { EmailCorrectionInline } from "@/components/auth/email-correction-inline";
import { getSignupEmailRedirectTo } from "@/lib/auth/email-redirects";
import { EMAIL_CODE_MESSAGES } from "@/lib/auth/messages";
import { PENDING_SIGNUP_STORAGE_KEY, type PendingSignupSnapshot } from "@/lib/auth/pending-signup";
import { createClient } from "@/lib/supabase/client";
import { getPostAuthRedirect } from "@/lib/auth/post-login-path";
import { legalAcceptanceIsCurrent, PROFILE_LEGAL_ACCEPTANCE_COLUMNS } from "@/lib/legal/acceptance";

const primaryBtnClass =
  "eid-btn-primary flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl px-3 text-[14px] font-bold transition hover:shadow-[0_8px_18px_-10px_rgba(249,115,22,0.7)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60";
const secondaryBtnClass =
  "flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/55 px-3 text-[13px] font-semibold text-eid-action-500 transition hover:border-eid-action-500/35 hover:bg-eid-card active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60";
const OTP_LENGTH = (() => {
  const raw = Number(process.env.NEXT_PUBLIC_EMAIL_OTP_LENGTH ?? "6");
  return Number.isInteger(raw) && raw >= 4 && raw <= 8 ? raw : 6;
})();
type VerifyMode = "signup" | "recovery";

export default function VerificarCodigoPage() {
  return (
    <Suspense fallback={null}>
      <VerificarCodigoPageInner />
    </Suspense>
  );
}

function VerificarCodigoPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = useMemo(() => (searchParams.get("email") ?? "").trim().toLowerCase(), [searchParams]);
  const next = useMemo(() => {
    const raw = (searchParams.get("next") ?? "").trim();
    if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
    return raw;
  }, [searchParams]);
  const mode: VerifyMode = useMemo(
    () => (searchParams.get("tipo") === "recovery" ? "recovery" : "signup"),
    [searchParams]
  );
  const [codeDigits, setCodeDigits] = useState<string[]>(Array.from({ length: OTP_LENGTH }, () => ""));
  const [correctedEmail, setCorrectedEmail] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const { resending, resend } = useResendEmailCode({ mode });

  const code = useMemo(() => codeDigits.join(""), [codeDigits]);
  const effectiveEmail = (correctedEmail ?? email).trim().toLowerCase();

  function setDigitAt(index: number, val: string) {
    setCodeDigits((prev) => {
      const n = [...prev];
      n[index] = val;
      return n;
    });
  }

  function onDigitChange(index: number, raw: string) {
    const v = raw.replace(/\D/g, "");
    if (!v) {
      setDigitAt(index, "");
      return;
    }
    if (v.length > 1) {
      const arr = v.slice(0, OTP_LENGTH).split("");
      setCodeDigits((prev) => {
        const n = [...prev];
        for (let i = 0; i < OTP_LENGTH; i++) n[i] = arr[i] ?? n[i] ?? "";
        return n;
      });
      const nextIdx = Math.min(v.length, OTP_LENGTH) - 1;
      inputRefs.current[nextIdx]?.focus();
      return;
    }
    setDigitAt(index, v);
    if (index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  }

  function onDigitKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !codeDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  }

  function onPasteOtp(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    const arr = pasted.split("");
    setCodeDigits((prev) => {
      const n = [...prev];
      for (let i = 0; i < OTP_LENGTH; i++) n[i] = arr[i] ?? "";
      return n;
    });
    inputRefs.current[Math.min(pasted.length, OTP_LENGTH) - 1]?.focus();
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMsg(null);
    const token = code.trim();
    if (!effectiveEmail) {
      setError(
        mode === "recovery"
          ? "E-mail inválido. Volte para recuperação de senha e tente novamente."
          : "E-mail inválido. Volte ao cadastro e tente novamente."
      );
      return;
    }
    if (!token || token.length !== OTP_LENGTH) {
      setError(`Informe o código de ${OTP_LENGTH} dígitos enviado por e-mail.`);
      return;
    }

    setLoading(true);
    const supabase = createClient();
    /** Confirmação de cadastro: usar `email` (tipos `signup`/`magiclink` estão depreciados no GoTrue / docs atuais). */
    const otpType = mode === "recovery" ? "recovery" : "email";
    const { error: verifyErr } = await supabase.auth.verifyOtp({
      email: effectiveEmail,
      token,
      type: otpType,
    });
    setLoading(false);

    if (verifyErr) {
      setError(
        mode === "recovery"
          ? "Código inválido ou expirado. Solicite um novo código de recuperação."
          : "Código inválido ou expirado. Solicite um novo código."
      );
      return;
    }

    if (mode === "recovery") {
      router.refresh();
      router.push("/redefinir-senha");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login?codigo=ok");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select(`perfil_completo, ${PROFILE_LEGAL_ACCEPTANCE_COLUMNS}`)
      .eq("id", user.id)
      .maybeSingle();
    const dest = getPostAuthRedirect(
      {
        termosAceitos: legalAcceptanceIsCurrent(profile),
        perfilCompleto: !!profile?.perfil_completo,
      },
      next
    );
    router.refresh();
    router.push(dest);
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(PENDING_SIGNUP_STORAGE_KEY);
    }
  }

  async function handleResend() {
    setError(null);
    setMsg(null);
    const result = await resend(effectiveEmail);
    if (!result.ok) {
      setError(result.error ?? "Não foi possível reenviar.");
      return;
    }
    setMsg(
      result.message ??
        (mode === "recovery"
          ? EMAIL_CODE_MESSAGES.resendSuccessRecovery
          : EMAIL_CODE_MESSAGES.resendSuccessSignup)
    );
  }

  async function handleApplyEmailEdit(normalized: string) {
    setError(null);
    if (mode === "recovery") {
      setMsg(EMAIL_CODE_MESSAGES.correctedEmailRecovery);
      setCorrectedEmail(normalized);
      setCodeDigits(Array.from({ length: OTP_LENGTH }, () => ""));
      const params = new URLSearchParams(searchParams.toString());
      params.set("email", normalized);
      router.replace(`/verificar-codigo?${params.toString()}`);
      return;
    }
    if (typeof window === "undefined") return;
    const raw = window.sessionStorage.getItem(PENDING_SIGNUP_STORAGE_KEY);
    if (!raw) {
      throw new Error(
        "Não encontramos os dados do cadastro para reenviar no novo e-mail. Volte ao cadastro e tente novamente."
      );
    }
    let snapshot: PendingSignupSnapshot;
    try {
      snapshot = JSON.parse(raw) as PendingSignupSnapshot;
    } catch {
      throw new Error("Dados de cadastro inválidos. Volte ao cadastro e tente novamente.");
    }
    if (!snapshot.password || snapshot.password.length < 6) {
      throw new Error("Senha de cadastro indisponível. Volte ao cadastro e tente novamente.");
    }
    const supabase = createClient();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const { error: signupErr } = await supabase.auth.signUp({
      email: normalized,
      password: snapshot.password,
      options: {
        data: snapshot.meta ?? {},
        ...(origin
          ? {
              emailRedirectTo: getSignupEmailRedirectTo(origin),
            }
          : {}),
      },
    });
    if (signupErr) {
      throw new Error(signupErr.message);
    }
    window.sessionStorage.setItem(
      PENDING_SIGNUP_STORAGE_KEY,
      JSON.stringify({ ...snapshot, email: normalized, savedAt: Date.now() })
    );
    setCorrectedEmail(normalized);
    setCodeDigits(Array.from({ length: OTP_LENGTH }, () => ""));
    setMsg(EMAIL_CODE_MESSAGES.correctedEmailSignup);
    const params = new URLSearchParams(searchParams.toString());
    params.set("email", normalized);
    router.replace(`/verificar-codigo?${params.toString()}`);
  }

  return (
    <main className="eid-auth-bg flex min-h-[100svh] w-full flex-1 flex-col items-center justify-center overflow-x-hidden px-4 py-[max(1.25rem,env(safe-area-inset-top,0px)+0.75rem)] text-eid-fg sm:px-6 sm:py-8">
      <div className="eid-native-auth-enter w-full max-w-[360px] pb-6">
        <Link
          href={
            mode === "recovery"
              ? "/recuperar-senha"
              : `/cadastro${next ? `?next=${encodeURIComponent(next)}` : ""}`
          }
          className="mb-4 inline-block text-[13px] text-eid-text-muted no-underline transition hover:text-eid-fg"
        >
          ← {mode === "recovery" ? "Voltar para recuperação" : "Voltar ao cadastro"}
        </Link>
        <LogoFull size="auth" className="mb-6 mt-1" />

        <div className="eid-auth-card p-5 sm:p-7">
          {/* Header */}
          <div className="mb-5 flex flex-col items-center text-center">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(145deg,color-mix(in_srgb,var(--eid-primary-500)_28%,var(--eid-card)),color-mix(in_srgb,var(--eid-primary-500)_12%,var(--eid-card)))] shadow-[0_0_28px_-6px_rgba(37,99,235,0.5),inset_0_1px_0_rgba(255,255,255,0.12)] ring-1 ring-eid-primary-500/30">
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-eid-primary-400" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </span>
            <h1 className="mt-3.5 text-[16px] font-black uppercase tracking-[0.1em] text-eid-fg">
              {mode === "recovery" ? "Redefinir senha" : "Confirme seu e-mail"}
            </h1>
            <p className="mt-1.5 max-w-[260px] text-[12px] leading-relaxed text-eid-text-secondary">
              {mode === "recovery"
                ? "Digite o código de verificação enviado para"
                : "Digite o código que enviamos para"}
            </p>
            <p className="mt-0.5 max-w-[260px] truncate text-[13px] font-semibold text-eid-fg">
              {effectiveEmail || "seu e-mail"}
            </p>
          </div>

          {/* Messages */}
          {msg ? (
            <p className="mb-4 rounded-xl border border-eid-primary-500/30 bg-eid-primary-500/10 px-3 py-2.5 text-center text-[12px] leading-snug text-eid-primary-300">
              {msg}
            </p>
          ) : null}
          {error ? (
            <p className="mb-4 rounded-xl border border-[rgba(255,107,107,0.22)] bg-[rgba(255,107,107,0.1)] px-3 py-2.5 text-center text-[12px] leading-snug text-[#ff6b6b]" role="alert">
              {error}
            </p>
          ) : null}

          {/* OTP form */}
          <form onSubmit={handleVerify} className="flex flex-col gap-4">
            <div>
              <div
                className="grid gap-2.5"
                style={{ gridTemplateColumns: `repeat(${OTP_LENGTH}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: OTP_LENGTH }).map((_, idx) => (
                  <input
                    key={idx}
                    id={`otp-${idx}`}
                    ref={(el) => {
                      inputRefs.current[idx] = el;
                    }}
                    inputMode="numeric"
                    autoComplete={idx === 0 ? "one-time-code" : "off"}
                    maxLength={1}
                    value={codeDigits[idx]}
                    onPaste={onPasteOtp}
                    onChange={(e) => onDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => onDigitKeyDown(idx, e)}
                    aria-label={`Dígito ${idx + 1} de ${OTP_LENGTH}`}
                    className="h-[58px] w-full rounded-[14px] border-[1.5px] border-[color:var(--eid-border-subtle)] bg-[color:var(--eid-field-bg)] px-0 text-center text-[22px] font-black tracking-widest text-eid-fg outline-none transition-all duration-150 focus:border-eid-primary-500/60 focus:bg-[color:var(--eid-card)] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.14)] [&:not(:placeholder-shown)]:border-eid-primary-500/30 [&:not(:placeholder-shown)]:bg-[color:var(--eid-card)]"
                    required
                  />
                ))}
              </div>
              <p className="mt-2 text-center text-[11px] text-eid-text-muted">
                {mode === "recovery"
                  ? "O link no e-mail também funciona."
                  : "Cole o código ou digite dígito por dígito."}
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || code.length < OTP_LENGTH}
              className="flex h-[52px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-0 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--eid-action-400)_65%,#fff_35%),var(--eid-action-500)_50%,var(--eid-action-600))] text-[14px] font-extrabold uppercase tracking-wide text-white shadow-[0_8px_24px_-10px_rgba(249,115,22,0.6)] transition hover:brightness-105 hover:shadow-[0_12px_30px_-10px_rgba(249,115,22,0.75)] active:scale-[0.97] active:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {loading ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden />
                  <span>Verificando...</span>
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                    <path d="m5 12 4 4 10-10" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Confirmar código
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-[color:var(--eid-border-subtle)]" />
            <span className="text-[11px] text-eid-text-muted">ou</span>
            <div className="h-px flex-1 bg-[color:var(--eid-border-subtle)]" />
          </div>

          {/* Resend */}
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="flex h-[46px] w-full items-center justify-center gap-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-transparent px-3 text-[13px] font-semibold text-eid-text-secondary transition hover:border-eid-primary-500/30 hover:bg-eid-card/60 hover:text-eid-fg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {resending ? (
              <>
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-eid-text-secondary border-t-transparent" aria-hidden />
                <span>Reenviando...</span>
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-eid-primary-400" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                Não recebi o código — reenviar
              </>
            )}
          </button>

          {/* Email correction */}
          <div className="mt-3 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/40 px-3 py-2.5">
            <EmailCorrectionInline
              currentEmail={effectiveEmail}
              onApplyEmail={handleApplyEmailEdit}
              triggerLabel="E-mail errado? Corrigir e reenviar"
              inputId="verify-email-edit"
              triggerClassName="w-full text-center text-[12px] font-semibold text-eid-text-muted transition hover:text-eid-action-500"
            />
          </div>
        </div>
      </div>
    </main>
  );
}

