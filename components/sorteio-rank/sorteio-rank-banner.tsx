"use client";

import { useState, useTransition } from "react";
import { toggleSorteioRankAtivo } from "@/app/admin/sorteio-rank/actions";

type Props = {
  jaAtivo: boolean;
};

/**
 * Banner exibido no dashboard para usuários elegíveis que:
 * - têm acesso ao feature "sorteio_rank"
 * - nunca explicitamente optaram por participar/sair
 *
 * Para usuários que já estão ativos: não exibe (ou exibe estado diferente).
 * Para usuários que saíram: exibe CTA para reativar.
 */
export function SorteioRankBanner({ jaAtivo }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [pending, startTransition] = useTransition();

  if (dismissed) return null;

  function handleAtivar() {
    const fd = new FormData();
    fd.set("ativo", "1");
    startTransition(async () => {
      await toggleSorteioRankAtivo(fd);
      setDismissed(true);
    });
  }

  function handleRecusar() {
    const fd = new FormData();
    fd.set("ativo", "0");
    startTransition(async () => {
      await toggleSorteioRankAtivo(fd);
      setDismissed(true);
    });
  }

  if (jaAtivo) {
    // Usuário já está ativo — exibe confirmação sutil, não um CTA
    return null;
  }

  return (
    <div className="rounded-2xl border border-eid-primary-500/30 bg-eid-primary-500/8 p-4">
      <div className="flex items-start gap-3">
        {/* Ícone */}
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-eid-primary-500/30 bg-eid-primary-500/15 text-lg">
          🎲
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-eid-fg">
            Sorteio de Ranking Mensal
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-eid-text-secondary">
            Todo mês, o EsporteID sorteia um adversário de ranking perto de você
            (até 30 km, mesmo esporte). O confronto ocupa 1 dos seus 4 slots mensais.
            Quer participar automaticamente?
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleAtivar}
              disabled={pending}
              className="rounded-xl border border-eid-action-500/40 bg-eid-action-500/15 px-4 py-1.5 text-xs font-bold text-eid-action-200 transition hover:border-eid-action-500/60 disabled:opacity-50"
            >
              {pending ? "Salvando…" : "Sim, quero participar"}
            </button>
            <button
              type="button"
              onClick={handleRecusar}
              disabled={pending}
              className="rounded-xl border border-[color:var(--eid-border-subtle)] px-3 py-1.5 text-xs text-eid-text-secondary transition hover:border-eid-primary-500/30 hover:text-eid-fg disabled:opacity-50"
            >
              Não, por enquanto não
            </button>
          </div>

          <p className="mt-2 text-[10px] text-eid-text-muted">
            Você pode alterar isso a qualquer momento em{" "}
            <a href="/conta/perfil" className="font-semibold text-eid-primary-300 hover:underline">
              Editar perfil
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Banner compacto para usuário que está ativo — lembra do confronto pendente.
 */
export function SorteioRankConfrontoBanner({
  oponenteNome,
  dataLimite,
  confrontoId,
}: {
  oponenteNome: string;
  dataLimite: string;
  confrontoId: number;
}) {
  const [pending, startTransition] = useTransition();

  function handleTentouAgendar() {
    startTransition(async () => {
      const { registrarTentativaAgendamentoSorteio } = await import(
        "@/app/admin/sorteio-rank/actions"
      );
      const fd = new FormData();
      fd.set("confronto_id", String(confrontoId));
      await registrarTentativaAgendamentoSorteio(fd);
    });
  }

  const limite = new Date(dataLimite + "T12:00:00Z").toLocaleDateString("pt-BR");

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/8 p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/15 text-lg">
          ⚔️
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-eid-fg">Confronto do mês sorteado!</p>
          <p className="mt-0.5 text-xs leading-relaxed text-eid-text-secondary">
            Você foi sorteado contra <strong className="text-eid-fg">{oponenteNome}</strong>.
            Agende o confronto até <strong className="text-eid-fg">{limite}</strong>.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleTentouAgendar}
              disabled={pending}
              className="rounded-xl border border-amber-500/40 bg-amber-500/15 px-4 py-1.5 text-xs font-bold text-amber-200 transition hover:border-amber-400/60 disabled:opacity-50"
            >
              {pending ? "Registrando…" : "Já propus um horário"}
            </button>
          </div>
          <p className="mt-2 text-[10px] text-eid-text-muted">
            Se o oponente recusar ou dificultar o agendamento, você pode ganhar por WO.
          </p>
        </div>
      </div>
    </div>
  );
}
