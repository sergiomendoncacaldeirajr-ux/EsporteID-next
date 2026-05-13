"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { LogoFull } from "@/components/brand/logo-full";
import { EidThemeToggle } from "@/components/eid-theme-toggle";
import { aceitarTermosEprivacidade } from "./actions";

function safeNextPath(raw: string | null): string {
  const v = (raw ?? "").trim() || "/onboarding";
  if (!v.startsWith("/") || v.startsWith("//")) return "/onboarding";
  return v;
}

export function AceitarForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const afterAccept = safeNextPath(searchParams.get("next"));
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const r = await aceitarTermosEprivacidade(undefined, fd);
    setPending(false);
    if (r.ok) {
      router.refresh();
      router.push(afterAccept);
      return;
    }
    setMessage(r.message);
  }

  return (
    <main
      data-eid-public-auth
      data-eid-touch-ui
      className="eid-auth-bg eid-public-auth-shell flex min-h-[100svh] w-full flex-col items-center justify-center overflow-x-hidden px-4 py-[max(1.5rem,env(safe-area-inset-top,0px)+1rem)] sm:px-6 sm:py-10"
    >
      {/* Toolbar */}
      <div className="mb-4 flex w-full max-w-[440px] items-center justify-end gap-2">
        <EidThemeToggle variant="toolbar" />
        <SignOutButton variant="icon" />
      </div>

      <div className="eid-native-auth-enter eid-public-auth-stack w-full max-w-[440px] pb-6">
        <LogoFull size="auth" className="mb-6 flex justify-center" />

        <form
          onSubmit={onSubmit}
          className="eid-auth-card eid-public-auth-card flex flex-col gap-0 p-5 sm:p-7"
        >
          {/* Header */}
          <div className="mb-6 flex flex-col items-center text-center">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(145deg,color-mix(in_srgb,var(--eid-primary-500)_28%,var(--eid-card)),color-mix(in_srgb,var(--eid-primary-500)_12%,var(--eid-card)))] shadow-[0_0_28px_-6px_rgba(37,99,235,0.5),inset_0_1px_0_rgba(255,255,255,0.12)] ring-1 ring-eid-primary-500/30">
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-eid-primary-400" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <h1 className="mt-3.5 text-[16px] font-black uppercase tracking-[0.1em] text-eid-fg">
              Termos e privacidade
            </h1>
            <p className="mt-2 max-w-[300px] text-[12px] leading-relaxed text-eid-text-secondary">
              Leia e confirme os documentos abaixo para usar o EsporteID.
              Seus dados são protegidos pela{" "}
              <span className="font-semibold text-eid-text-muted">LGPD (Lei 13.709/2018)</span>.
            </p>
          </div>

          {/* Required agreements */}
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.12em] text-eid-text-muted">
            Obrigatório
          </p>
          <div className="mb-4 flex flex-col gap-2.5">
            <label className="group flex cursor-pointer items-start gap-3.5 rounded-[14px] border border-[rgba(37,99,235,0.12)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--eid-primary-500)_6%,var(--eid-surface)),var(--eid-surface))] p-4 transition hover:border-eid-primary-500/30 hover:bg-[linear-gradient(135deg,color-mix(in_srgb,var(--eid-primary-500)_10%,var(--eid-surface)),var(--eid-surface))] has-[:checked]:border-eid-primary-500/40 has-[:checked]:bg-[linear-gradient(135deg,color-mix(in_srgb,var(--eid-primary-500)_12%,var(--eid-surface)),var(--eid-surface))]">
              <div className="mt-[1px] flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-[1.5px] border-[color:var(--eid-border-subtle)] bg-[color:var(--eid-field-bg)] transition group-has-[:checked]:border-eid-action-500 group-has-[:checked]:bg-eid-action-500">
                <svg viewBox="0 0 12 12" className="h-3 w-3 text-white opacity-0 transition group-has-[:checked]:opacity-100" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                  <path d="m2 6 3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <input type="checkbox" name="aceite_termos" className="sr-only" required />
              </div>
              <span className="text-[13px] leading-relaxed text-eid-fg">
                Li e aceito os{" "}
                <Link href="/termos" target="_blank" className="font-bold text-eid-primary-300 underline-offset-2 hover:underline">
                  Termos de Uso
                </Link>
                , incluindo a{" "}
                <strong className="font-bold text-eid-fg">idade mínima de 18 anos</strong>.
              </span>
            </label>

            <label className="group flex cursor-pointer items-start gap-3.5 rounded-[14px] border border-[rgba(37,99,235,0.12)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--eid-primary-500)_6%,var(--eid-surface)),var(--eid-surface))] p-4 transition hover:border-eid-primary-500/30 hover:bg-[linear-gradient(135deg,color-mix(in_srgb,var(--eid-primary-500)_10%,var(--eid-surface)),var(--eid-surface))] has-[:checked]:border-eid-primary-500/40 has-[:checked]:bg-[linear-gradient(135deg,color-mix(in_srgb,var(--eid-primary-500)_12%,var(--eid-surface)),var(--eid-surface))]">
              <div className="mt-[1px] flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-[1.5px] border-[color:var(--eid-border-subtle)] bg-[color:var(--eid-field-bg)] transition group-has-[:checked]:border-eid-action-500 group-has-[:checked]:bg-eid-action-500">
                <svg viewBox="0 0 12 12" className="h-3 w-3 text-white opacity-0 transition group-has-[:checked]:opacity-100" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                  <path d="m2 6 3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <input type="checkbox" name="aceite_privacidade" className="sr-only" required />
              </div>
              <span className="text-[13px] leading-relaxed text-eid-fg">
                Li a{" "}
                <Link href="/privacidade" target="_blank" className="font-bold text-eid-primary-300 underline-offset-2 hover:underline">
                  Política de Privacidade
                </Link>{" "}
                e autorizo o tratamento dos meus dados conforme descrito.
              </span>
            </label>
          </div>

          {/* Optional */}
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.12em] text-eid-text-muted">
            Opcional
          </p>
          <label className="group mb-5 flex cursor-pointer items-start gap-3.5 rounded-[14px] border border-[color:var(--eid-border-subtle)] bg-eid-surface/25 p-4 transition hover:bg-eid-surface/40">
            <div className="mt-[1px] flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-[1.5px] border-[color:var(--eid-border-subtle)] bg-[color:var(--eid-field-bg)] transition group-has-[:checked]:border-eid-action-500 group-has-[:checked]:bg-eid-action-500">
              <svg viewBox="0 0 12 12" className="h-3 w-3 text-white opacity-0 transition group-has-[:checked]:opacity-100" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                <path d="m2 6 3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <input type="checkbox" name="marketing" className="sr-only" />
            </div>
            <span className="text-[12px] leading-relaxed text-eid-text-secondary">
              Quero receber novidades sobre eventos e torneios por e-mail.
            </span>
          </label>

          {/* Error */}
          {message ? (
            <p className="mb-4 rounded-xl border border-[rgba(255,107,107,0.22)] bg-[rgba(255,107,107,0.1)] px-3 py-2.5 text-center text-[12px] leading-snug text-[#ff6b6b]" role="alert">
              {message}
            </p>
          ) : null}

          {/* Submit */}
          <button
            type="submit"
            disabled={pending}
            className="flex h-[54px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-0 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--eid-action-400)_65%,#fff_35%),var(--eid-action-500)_50%,var(--eid-action-600))] text-[14px] font-extrabold uppercase tracking-wide text-white shadow-[0_8px_24px_-10px_rgba(249,115,22,0.65)] transition hover:brightness-105 hover:shadow-[0_12px_30px_-10px_rgba(249,115,22,0.75)] active:scale-[0.97] active:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
          >
            {pending ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                  <path d="m5 12 4 4 10-10" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Confirmar e continuar
              </>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
