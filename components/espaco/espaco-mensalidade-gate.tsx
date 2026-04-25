"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MensalidadePainelState } from "@/lib/espacos/mensalidade-acesso";
import type { ReactNode } from "react";

const FINANCEIRO = "/espaco/financeiro";
const INTEGRACAO = "/espaco/integracao-asaas";

export function EspacoMensalidadeGate({ state, children }: { state: MensalidadePainelState; children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const onFinanceiro = pathname === FINANCEIRO || pathname.startsWith(`${FINANCEIRO}/`);
  const onIntegracao = pathname === INTEGRACAO || pathname.startsWith(`${INTEGRACAO}/`);
  const onAgenda = pathname === "/espaco/agenda" || pathname.startsWith("/espaco/agenda/");

  if (onFinanceiro || onIntegracao) {
    return <>{children}</>;
  }

  if (state.nivel === "inativo_agenda" && onAgenda) {
    return (
      <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-6 text-center text-sm text-amber-50">
        <p className="text-base font-bold">Grade ainda bloqueada</p>
        <p className="mt-2 text-amber-100/90">{state.mensagem}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Link
            href={FINANCEIRO}
            className="inline-flex items-center justify-center rounded-xl border border-eid-primary-500/50 bg-eid-primary-500/20 px-4 py-2 text-sm font-bold text-eid-fg"
          >
            Ir para financeiro
          </Link>
          <Link
            href={INTEGRACAO}
            className="inline-flex items-center justify-center rounded-xl border border-eid-action-500/40 bg-eid-action-500/15 px-4 py-2 text-sm font-bold text-eid-action-300"
          >
            Integração de pagamento
          </Link>
        </div>
      </div>
    );
  }

  if (state.nivel === "bloqueado") {
    return (
      <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-6 text-center text-sm text-red-100">
        <p className="text-base font-bold">Painel suspenso por inadimplência</p>
        <p className="mt-2 text-red-100/90">{state.mensagem}</p>
        <Link
          href={FINANCEIRO}
          className="mt-4 inline-flex items-center justify-center rounded-xl border border-eid-primary-500/50 bg-eid-primary-500/20 px-4 py-2 text-sm font-bold text-eid-fg"
        >
          Acessar apenas financeiro
        </Link>
      </div>
    );
  }

  const showAviso =
    state.nivel === "aviso" || (state.diasEmAtraso > 0 && state.nivel !== "isento" && state.nivel !== "sem_assinatura");

  return (
    <>
      {state.nivel === "inativo_agenda" && !onAgenda ? (
        <div className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-50">
          <p className="font-semibold">Ativação da grade</p>
          <p className="mt-1 text-amber-100/90">{state.mensagem}</p>
        </div>
      ) : null}
      {showAviso ? (
        <div className="mb-4 rounded-2xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-50">
          <p className="font-semibold">Mensalidade da plataforma</p>
          <p className="mt-1 text-amber-100/90">{state.mensagem}</p>
          <Link href={FINANCEIRO} className="mt-2 inline-block text-xs font-bold text-amber-200 underline">
            Abrir financeiro
          </Link>
        </div>
      ) : null}
      {state.nivel === "sem_assinatura" ? (
        <div className="mb-4 rounded-2xl border border-eid-text-secondary/30 bg-eid-card/40 px-4 py-3 text-sm text-eid-text-secondary">
          <p>{state.mensagem}</p>
          <Link href={FINANCEIRO} className="mt-2 inline-block text-xs font-bold text-eid-primary-300 underline">
            Ver financeiro
          </Link>
        </div>
      ) : null}
      {children}
    </>
  );
}
