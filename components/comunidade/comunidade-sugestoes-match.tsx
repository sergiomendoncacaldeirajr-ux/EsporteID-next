"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { responderSugestaoMatch, type ResponderSugestaoMatchState } from "@/app/comunidade/actions";

export type SugestaoMatchItem = {
  id: number;
  sugeridorNome: string;
  sugeridorId: string;
  meuTimeNome: string;
  alvoTimeNome: string;
  esporte: string;
  modalidade: string;
  mensagem: string | null;
};

const initial: ResponderSugestaoMatchState = { ok: false, message: "" };

export function ComunidadeSugestoesMatch({ items }: { items: SugestaoMatchItem[] }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(responderSugestaoMatch, initial);
  const err = !state.ok && state.message ? state.message : null;
  const okMsg = state.ok ? "Resposta registrada." : null;

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  if (items.length === 0) {
    return (
      <p className="mt-2 rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-card p-3 text-sm text-eid-text-secondary">
        Nenhuma sugestão de desafio da equipe. Atletas que não são líderes podem sugerir pelo perfil da formação adversária.
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      {okMsg ? (
        <p className="rounded-lg border border-eid-primary-500/35 bg-eid-primary-500/10 px-3 py-2 text-xs text-eid-fg">{okMsg}</p>
      ) : null}
      {err ? <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{err}</p> : null}

      <ul className="space-y-3">
        {items.map((s) => (
          <li
            key={s.id}
            className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-3 text-sm md:p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-amber-200/90">Sugestão de membro</p>
                <p className="mt-1 text-sm font-bold text-eid-fg">
                  {s.meuTimeNome} → {s.alvoTimeNome}
                </p>
                <p className="mt-1 text-xs text-eid-text-secondary">
                  Sugerido por {s.sugeridorNome} · {s.esporte} · {s.modalidade}
                </p>
                {s.mensagem ? (
                  <p className="mt-2 rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-card/80 px-2 py-1.5 text-xs text-eid-fg">
                    “{s.mensagem}”
                  </p>
                ) : null}
                <Link
                  href={`/perfil/${s.sugeridorId}?from=/comunidade`}
                  className="mt-2 inline-flex text-xs font-bold text-eid-primary-300 hover:underline"
                >
                  Ver quem sugeriu →
                </Link>
              </div>
              <span className="rounded-full border border-amber-400/40 bg-amber-500/15 px-2.5 py-1 text-[10px] font-extrabold uppercase text-amber-100">
                Aguardando você
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <form action={formAction}>
                <input type="hidden" name="sugestao_id" value={String(s.id)} />
                <input type="hidden" name="aceitar" value="true" />
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-lg border border-eid-action-500/50 bg-eid-action-500/15 px-4 py-2 text-xs font-bold text-eid-action-500 transition hover:bg-eid-action-500/25 disabled:opacity-50"
                >
                  {pending ? "Salvando…" : "Aprovar e confirmar desafio"}
                </button>
              </form>
              <form action={formAction}>
                <input type="hidden" name="sugestao_id" value={String(s.id)} />
                <input type="hidden" name="aceitar" value="false" />
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-lg border border-[color:var(--eid-border-subtle)] px-4 py-2 text-xs font-semibold text-eid-text-secondary transition hover:border-red-400/40 hover:text-red-200 disabled:opacity-50"
                >
                  Recusar
                </button>
              </form>
            </div>
            <p className="mt-2 text-[10px] text-eid-text-secondary">
              Ao aprovar, o sistema registra o desafio como <strong className="text-eid-fg">confirmado</strong> e notifica
              todos os membros ativos das duas formações.
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
