"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { limparNotificacoesDesafio, limparNotificacoesEquipe } from "@/app/comunidade/actions";
import { PEDIDO_LIMPAR_COMPACT_BTN_CLASS, PEDIDO_VER_MAIS_COMPACT_BTN_CLASS } from "@/lib/desafio/flow-ui";

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
            className={PEDIDO_VER_MAIS_COMPACT_BTN_CLASS}
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
          className={PEDIDO_LIMPAR_COMPACT_BTN_CLASS}
        >
          {pending ? "…" : "Limpar"}
        </button>
      </div>
    </>
  );
}
