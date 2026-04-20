"use client";

import Link from "next/link";
import { Suspense, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogoFull } from "@/components/brand/logo-full";
import { createClient } from "@/lib/supabase/client";
import { getRecoveryEmailRedirectTo, getSignupEmailRedirectTo } from "@/lib/auth/email-redirects";
import { getPostAuthRedirect } from "@/lib/auth/post-login-path";

const inputClass =
  "eid-input-dark w-full rounded-xl px-3 py-3 text-eid-fg placeholder:text-eid-text-secondary/85";
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
  const mode: VerifyMode = useMemo(
    () => (searchParams.get("tipo") === "recovery" ? "recovery" : "signup"),
    [searchParams]
  );
  const [codeDigits, setCodeDigits] = useState<string[]>(Array.from({ length: OTP_LENGTH }, () => ""));
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const code = useMemo(() => codeDigits.join(""), [codeDigits]);

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
    if (!email) {
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
    const { error: verifyErr } = await supabase.auth.verifyOtp({
      email,
      token,
      type: mode,
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
      .select("termos_aceitos_em, perfil_completo")
      .eq("id", user.id)
      .maybeSingle();
    const dest = getPostAuthRedirect(
      {
        termosAceitos: !!profile?.termos_aceitos_em,
        perfilCompleto: !!profile?.perfil_completo,
      },
      null
    );
    router.refresh();
    router.push(dest);
  }

  async function handleResend() {
    setError(null);
    setMsg(null);
    if (!email) {
      setError("E-mail inválido para reenvio.");
      return;
    }
    setResending(true);
    const supabase = createClient();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const resendErr =
      mode === "recovery"
        ? (
            await supabase.auth.resetPasswordForEmail(email, {
              redirectTo: getRecoveryEmailRedirectTo(origin),
            })
          ).error
        : (
            await supabase.auth.resend({
              type: "signup",
              email,
              options: {
                ...(origin
                  ? {
                      emailRedirectTo: getSignupEmailRedirectTo(origin),
                    }
                  : {}),
              },
            })
          ).error;
    setResending(false);
    if (resendErr) {
      setError(resendErr.message);
      return;
    }
    setMsg(
      mode === "recovery"
        ? "Código de recuperação reenviado. Verifique seu e-mail."
        : "Código reenviado. Verifique seu e-mail."
    );
  }

  return (
    <main className="eid-auth-bg flex w-full flex-1 flex-col items-center overflow-x-hidden px-4 pb-28 pt-14 text-eid-fg sm:px-6 sm:pt-7">
      <div className="w-full max-w-[340px] pb-6">
        <Link
          href={mode === "recovery" ? "/recuperar-senha" : "/cadastro"}
          className="mb-3 inline-block text-[13px] text-eid-text-muted no-underline transition hover:text-eid-fg"
        >
          {mode === "recovery" ? "← Voltar para recuperação" : "← Voltar ao cadastro"}
        </Link>
        <LogoFull priority className="mb-5 mt-1" />

        <div className="eid-auth-card p-5">
          <h1 className="text-center text-[14px] font-extrabold uppercase tracking-[1px] text-eid-primary-500">
            {mode === "recovery" ? "Confirmar recuperação" : "Confirmar e-mail"}
          </h1>
          <p className="mt-2 text-center text-[12px] leading-snug text-eid-text-secondary">
            {mode === "recovery" ? "Digite o código de recuperação enviado para " : "Digite o código enviado para "}
            <span className="font-semibold text-eid-fg">{email || "seu e-mail"}</span>.
          </p>

          <form onSubmit={handleVerify} className="mt-4 flex flex-col gap-3">
            {msg ? (
              <p className="rounded-xl border border-eid-primary-500/30 bg-eid-primary-500/10 px-2.5 py-2 text-center text-[12px] text-eid-primary-300">
                {msg}
              </p>
            ) : null}
            {error ? (
              <p className="rounded-xl border border-[rgba(255,107,107,0.2)] bg-[rgba(255,107,107,0.1)] px-2.5 py-2 text-center text-[12px] text-[#ff6b6b]">
                {error}
              </p>
            ) : null}

            <div>
              <label htmlFor="otp-0" className="mb-2 block text-[11px] font-semibold text-eid-text-secondary">
                Código de {OTP_LENGTH} dígitos
              </label>
              <div
                className="grid gap-2"
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
                    className="eid-input-dark h-12 w-full rounded-xl px-0 text-center text-lg font-bold text-eid-fg"
                    required
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="eid-btn-primary rounded-xl text-sm disabled:opacity-60"
            >
              {loading ? "Confirmando..." : "Confirmar código"}
            </button>
          </form>

          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="mt-3 w-full text-center text-[12px] font-semibold text-eid-action-500 transition hover:text-eid-action-400 disabled:opacity-60"
          >
            {resending ? "Reenviando..." : "Não recebeu? Reenviar código"}
          </button>

          <p className="mt-3 text-center text-[11px] text-eid-text-secondary">
            {mode === "recovery"
              ? "O link de recuperação no e-mail também funciona."
              : "O link de confirmação no e-mail também funciona."}
          </p>
        </div>
      </div>
    </main>
  );
}

