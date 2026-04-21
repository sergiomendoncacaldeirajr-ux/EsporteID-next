"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
    <form
      onSubmit={onSubmit}
      className="eid-auth-card mx-auto flex max-w-lg flex-col gap-6 p-8"
    >
      <div>
        <h1 className="text-xl font-semibold text-eid-fg">Termos e privacidade</h1>
        <p className="mt-2 text-sm leading-relaxed text-eid-text-secondary">
          Para usar o EsporteID, confirme que leu e concorda com os documentos
          abaixo. O tratamento de dados pessoais segue a LGPD (Lei 13.709/2018).
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
        className="eid-btn-primary rounded-xl text-sm disabled:opacity-60"
      >
        {pending ? "Salvando…" : "Confirmar e continuar"}
      </button>
    </form>
  );
}
