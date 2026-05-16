"use client";

import { useOptimistic, useTransition } from "react";
import { toggleSorteioRankAtivo } from "@/app/admin/sorteio-rank/actions";

type Props = {
  ativo: boolean;
};

/**
 * Toggle de participação no sorteio mensal de ranking.
 * Exibido na página /conta/perfil.
 *
 * Comportamento:
 * - true (padrão): usuário participa do sorteio automático
 * - false: usuário não participa no próximo ciclo
 * Ao reativar, a participação volta no próximo sorteio.
 */
export function SorteioRankToggle({ ativo }: Props) {
  const [optimisticAtivo, setOptimisticAtivo] = useOptimistic(ativo);
  const [pending, startTransition] = useTransition();

  function handleToggle() {
    const novoValor = !optimisticAtivo;
    startTransition(async () => {
      setOptimisticAtivo(novoValor);
      const fd = new FormData();
      fd.set("ativo", novoValor ? "1" : "0");
      await toggleSorteioRankAtivo(fd);
    });
  }

  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 p-4">
      <div className="min-w-0">
        <p className="text-sm font-bold text-eid-fg">
          Sorteio de Ranking Mensal
        </p>
        <p className="mt-0.5 text-[12px] leading-relaxed text-eid-text-secondary">
          {optimisticAtivo
            ? "Você será incluído automaticamente no sorteio mensal. Ocupa 1 dos 4 slots de confronto."
            : "Você não participará do próximo sorteio. Ative para voltar à fila."}
        </p>
        {optimisticAtivo && (
          <p className="mt-1.5 text-[11px] text-eid-text-muted">
            Para sair de um sorteio já publicado, entre em contato com o suporte.
          </p>
        )}
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={optimisticAtivo}
        onClick={handleToggle}
        disabled={pending}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full border transition-colors duration-200 ${
          optimisticAtivo
            ? "border-eid-action-500/60 bg-eid-action-500"
            : "border-[color:var(--eid-border-subtle)] bg-eid-surface"
        } disabled:opacity-50`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
            optimisticAtivo ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
