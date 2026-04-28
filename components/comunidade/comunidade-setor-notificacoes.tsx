"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { limparNotificacoesDesafio, limparNotificacoesEquipe } from "@/app/comunidade/actions";

const INITIAL = 3;

type Item = { id: number; mensagem: string | null; lida: boolean | null };

export function ComunidadeSetorNotificacoes({
  items,
  sector,
  emptyLabel,
}: {
  items: Item[];
  sector: "desafio" | "equipe";
  emptyLabel: string;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [pending, setPending] = useState(false);
  const visible = useMemo(() => (expanded ? items : items.slice(0, INITIAL)), [items, expanded]);
  const limpar = sector === "desafio" ? limparNotificacoesDesafio : limparNotificacoesEquipe;
  const sectorLabel = sector === "desafio" ? "desafio" : "equipe";

  if (items.length === 0) {
    return <p className="mt-2 text-xs text-eid-text-secondary">{emptyLabel}</p>;
  }

  return (
    <>
      <ul className="mt-2 space-y-2">
        {visible.map((n) => (
          <li key={n.id} className="rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2">
            <p className={`text-xs leading-relaxed ${n.lida ? "text-eid-text-secondary" : "text-eid-fg"}`}>{n.mensagem}</p>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.length > INITIAL ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex min-h-[22px] items-center rounded-md border border-eid-primary-500/35 bg-eid-primary-500/8 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.04em] text-eid-primary-300 transition hover:border-eid-primary-500/50"
          >
            {expanded ? "Ver menos" : "Ver mais"}
          </button>
        ) : null}
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            void (async () => {
              if (!confirm(`Apagar todas as notificações deste bloco (${sectorLabel})?`)) return;
              setPending(true);
              try {
                await limpar();
                router.refresh();
              } finally {
                setPending(false);
              }
            })();
          }}
          className="inline-flex min-h-[22px] items-center rounded-md border border-[color:var(--eid-border-subtle)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.04em] text-eid-text-secondary transition hover:border-red-400/40 hover:text-red-300 disabled:opacity-50"
        >
          {pending ? "…" : "Limpar"}
        </button>
      </div>
    </>
  );
}
