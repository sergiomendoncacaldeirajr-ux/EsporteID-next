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
    <>
      <div className="mx-auto mb-3 flex w-full max-w-lg items-center justify-end gap-2">
        <EidThemeToggle variant="toolbar" />
        <SignOutButton variant="icon" />
      </div>

      <form
        onSubmit={onSubmit}
        className="eid-auth-card mx-auto flex max-w-lg flex-col gap-5 p-6 sm:p-8"
      >
      <div className="flex flex-col items-center gap-3">
        <LogoFull className="flex justify-center" />
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,color-mix(in_srgb,var(--eid-primary-500)_20%,var(--eid-card)),color-mix(in_srgb,var(--eid-primary-500)_8%,var(--eid-card)))] shadow-[0_0_20px_-6px_rgba(37,99,235,0.4)] ring-1 ring-eid-primary-500/25">
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-eid-primary-400" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/>
          </svg>
        </span>
        <div className="text-center">
          <h1 className="text-[15px] font-black uppercase tracking-[0.08em] text-eid-fg">Termos e privacidade</h1>
          <p className="mt-1.5 text-[12px] leading-relaxed text-eid-text-secondary">
            Para usar o EsporteID, confirme que leu e concorda com a versão vigente dos documentos.
            O tratamento de dados segue a LGPD (Lei 13.709/2018).
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[rgba(37,99,235,0.1)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--eid-primary-500)_5%,var(--eid-surface)),var(--eid-surface))] p-3 text-sm text-eid-fg transition hover:border-eid-primary-500/25">
          <input
            type="checkbox"
            name="aceite_termos"
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-[color:var(--eid-border-subtle)] accent-eid-action-500"
            required
          />
          <span className="text-[13px] leading-relaxed">
            Li e aceito os{" "}
            <Link href="/termos" className="font-semibold text-eid-primary-300 underline-offset-2 hover:underline">
              Termos de Uso
            </Link>
            , incluindo a <strong className="font-semibold text-eid-fg">idade mínima de 18 anos</strong>.
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[rgba(37,99,235,0.1)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--eid-primary-500)_5%,var(--eid-surface)),var(--eid-surface))] p-3 text-sm text-eid-fg transition hover:border-eid-primary-500/25">
          <input
            type="checkbox"
            name="aceite_privacidade"
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-[color:var(--eid-border-subtle)] accent-eid-action-500"
            required
          />
          <span className="text-[13px] leading-relaxed">
            Li a{" "}
            <Link href="/privacidade" className="font-semibold text-eid-primary-300 underline-offset-2 hover:underline">
              Política de Privacidade
            </Link>{" "}
            e autorizo o tratamento dos meus dados conforme descrito.
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/30 p-3 text-sm text-eid-fg">
          <input
            type="checkbox"
            name="marketing"
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-[color:var(--eid-border-subtle)] accent-eid-action-500"
          />
          <span className="text-[12px] leading-relaxed text-eid-text-secondary">
            Quero receber comunicações sobre eventos, torneios e novidades <span className="text-eid-text-muted">(opcional)</span>.
          </span>
        </label>
      </div>

      {message ? (
        <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-200">
          {message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="flex min-h-[54px] w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,color-mix(in_srgb,var(--eid-action-400)_65%,#fff_35%),var(--eid-action-500)_50%,var(--eid-action-600))] px-5 text-[14px] font-extrabold uppercase tracking-wide text-white shadow-[0_8px_24px_-10px_rgba(249,115,22,0.65)] transition hover:brightness-105 hover:shadow-[0_12px_30px_-10px_rgba(249,115,22,0.75)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? (
          <>
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden />
            <span>Salvando...</span>
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
              <path d="m5 12 4 4 10-10" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Confirmar e continuar
          </>
        )}
      </button>
      </form>
    </>
  );
}
