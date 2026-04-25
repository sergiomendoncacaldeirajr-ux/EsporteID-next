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
        className="eid-auth-card mx-auto flex max-w-lg flex-col gap-6 p-8"
      >
      <LogoFull className="mb-1 flex justify-center" />
      <div>
        <h1 className="text-xl font-semibold text-eid-fg">Termos e privacidade</h1>
        <p className="mt-2 text-sm leading-relaxed text-eid-text-secondary">
          Para usar o EsporteID, confirme que leu e concorda com a versão vigente dos documentos
          abaixo. Quando publicarmos uma nova versão, será necessário aceitar de novo para continuar.
          O tratamento de dados pessoais segue a LGPD (Lei 13.709/2018).
        </p>
      </div>

      <label className="flex cursor-pointer items-start gap-3 text-sm text-eid-fg">
        <input
          type="checkbox"
          name="aceite_termos"
          className="mt-1 h-4 w-4 rounded border-[color:var(--eid-border-subtle)] accent-eid-action-500"
          required
        />
        <span>
          Li e aceito os{" "}
          <Link href="/termos" className="font-medium text-eid-primary-300 underline hover:text-eid-fg">
            Termos de Uso
          </Link>
          , incluindo a regra de{" "}
          <strong className="font-semibold text-eid-fg">idade mínima de 18 anos</strong> para uso da
          Plataforma e para funcionalidades que envolvam encontros ou interação entre usuários.
        </span>
      </label>

      <label className="flex cursor-pointer items-start gap-3 text-sm text-eid-fg">
        <input
          type="checkbox"
          name="aceite_privacidade"
          className="mt-1 h-4 w-4 rounded border-[color:var(--eid-border-subtle)] accent-eid-action-500"
          required
        />
        <span>
          Li a{" "}
          <Link
            href="/privacidade"
            className="font-medium text-eid-primary-300 underline hover:text-eid-fg"
          >
            Política de Privacidade
          </Link>{" "}
          e autorizo o tratamento dos meus dados conforme descrito.
        </span>
      </label>

      <label className="flex cursor-pointer items-start gap-3 text-sm text-eid-fg">
        <input
          type="checkbox"
          name="marketing"
          className="mt-1 h-4 w-4 rounded border-[color:var(--eid-border-subtle)] accent-eid-action-500"
        />
        <span>
          Quero receber comunicações sobre eventos, torneios e novidades (opcional).
        </span>
      </label>

      {message ? (
        <p className="rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="eid-btn-primary flex min-h-[58px] w-full items-center justify-center gap-2 rounded-xl px-5 !text-[15px] font-extrabold tracking-[0.01em] transition hover:shadow-[0_10px_22px_-10px_rgba(249,115,22,0.7)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? (
          <>
            <span
              className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
              aria-hidden
            />
            <span>Salvando...</span>
          </>
        ) : (
          "Confirmar e continuar"
        )}
      </button>
      </form>
    </>
  );
}
