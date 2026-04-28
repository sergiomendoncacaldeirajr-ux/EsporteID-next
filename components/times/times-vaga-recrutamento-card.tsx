"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { CandidatarNaVagaForm, CancelarCandidaturaForm } from "@/components/vagas/vagas-actions";
import { DESAFIO_FLOW_SECONDARY_CLASS } from "@/lib/desafio/flow-ui";

export type TimesVagaCardData = {
  id: number;
  nome: string | null;
  localizacao: string | null;
  escudo: string | null;
  eid_time: number | null;
  nivel_procurado: string | null;
  tipo: string | null;
  esporteNome: string | null;
  vagas_abertas: boolean;
  aceita_pedidos: boolean;
  criador_id: string;
};

export function TimesVagaRecrutamentoCard({
  team,
  viewerUserId,
  minhaCandidaturaPendenteId,
  jaSouMembro,
}: {
  team: TimesVagaCardData;
  viewerUserId: string;
  minhaCandidaturaPendenteId: number | null;
  jaSouMembro: boolean;
}) {
  const [showMsg, setShowMsg] = useState(false);
  const isLider = team.criador_id === viewerUserId;
  const aceitaCand = Boolean(team.vagas_abertas && team.aceita_pedidos);
  const tipoLabel = String(team.tipo ?? "time").toLowerCase() === "dupla" ? "Dupla" : "Time";
  const perfilHref = `/perfil-time/${team.id}?from=/times`;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-[color:color-mix(in_srgb,var(--eid-border-subtle)_82%,var(--eid-primary-500)_18%)] bg-[linear-gradient(165deg,color-mix(in_srgb,var(--eid-card)_92%,var(--eid-primary-500)_8%),color-mix(in_srgb,var(--eid-surface)_88%,var(--eid-bg)_12%))] p-3 shadow-[0_14px_40px_-28px_rgba(37,99,235,0.55)] transition duration-300 hover:border-eid-primary-500/45 hover:shadow-[0_20px_48px_-24px_rgba(37,99,235,0.42)] sm:p-4">
      <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-eid-action-500/12 blur-2xl transition duration-500 group-hover:bg-eid-action-500/18" aria-hidden />
      <div className="relative flex gap-3">
        <div className="relative h-[4.25rem] w-[4.25rem] shrink-0 sm:h-[4.75rem] sm:w-[4.75rem]">
          {team.escudo ? (
            <Image
              src={team.escudo}
              alt=""
              width={76}
              height={76}
              unoptimized
              className="h-full w-full rounded-2xl border-2 border-eid-primary-500/45 object-cover shadow-[0_8px_24px_-12px_rgba(0,0,0,0.5)]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-2xl border-2 border-eid-primary-500/40 bg-eid-surface text-lg font-black text-eid-primary-300">
              {tipoLabel.slice(0, 1)}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full border border-eid-primary-500/35 bg-eid-primary-500/12 px-2 py-px text-[8px] font-black uppercase tracking-[0.1em] text-eid-primary-300">
              {tipoLabel}
            </span>
            {team.esporteNome ? (
              <span className="rounded-full border border-eid-action-500/30 bg-eid-action-500/10 px-2 py-px text-[8px] font-bold uppercase tracking-wide text-eid-action-400">
                {team.esporteNome}
              </span>
            ) : null}
            {aceitaCand ? (
              <span className="rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2 py-px text-[8px] font-black uppercase tracking-wide text-emerald-300">
                Recrutando
              </span>
            ) : (
              <span className="rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 px-2 py-px text-[8px] font-bold uppercase tracking-wide text-eid-text-secondary">
                Sem vagas
              </span>
            )}
          </div>
          <h2 className="mt-1.5 line-clamp-2 text-sm font-black uppercase leading-tight tracking-tight text-eid-fg sm:text-base">
            {team.nome ?? "Formação"}
          </h2>
          <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-eid-text-secondary">{team.localizacao ?? "Localização não informada"}</p>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-eid-text-secondary">
            <span>
              <span className="font-bold text-eid-fg/90">EID</span> {Number(team.eid_time ?? 0).toFixed(1)}
            </span>
            <span className="text-[color:var(--eid-border-subtle)]">·</span>
            <span>
              Nível: <span className="text-eid-fg/90">{team.nivel_procurado?.trim() ? team.nivel_procurado : "a definir"}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="relative mt-3 flex flex-col gap-2 border-t border-[color:color-mix(in_srgb,var(--eid-border-subtle)_75%,transparent)] pt-3">
        <Link href={perfilHref} className={DESAFIO_FLOW_SECONDARY_CLASS + " w-full"}>
          Ver perfil da formação
        </Link>

        {!isLider && !jaSouMembro && aceitaCand && minhaCandidaturaPendenteId == null ? (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowMsg((v) => !v)}
              className="w-full text-center text-[10px] font-semibold uppercase tracking-wide text-eid-text-secondary underline-offset-2 hover:text-eid-primary-300 hover:underline"
            >
              {showMsg ? "Ocultar mensagem opcional" : "Adicionar mensagem ao líder (opcional)"}
            </button>
            <CandidatarNaVagaForm timeId={team.id} hideMessageField={!showMsg} />
          </div>
        ) : null}

        {!isLider && !jaSouMembro && aceitaCand && minhaCandidaturaPendenteId != null ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2">
            <p className="text-[11px] font-semibold text-amber-100/95">Candidatura enviada — aguardando o líder.</p>
            <div className="mt-2">
              <CancelarCandidaturaForm candidaturaId={minhaCandidaturaPendenteId} />
            </div>
          </div>
        ) : null}

        {isLider ? (
          <p className="rounded-xl border border-eid-primary-500/25 bg-eid-primary-500/8 px-3 py-2 text-center text-[10px] text-eid-text-secondary">
            Esta é a sua formação — gerencie pedidos na caixa <strong className="text-eid-fg">“Pedidos para o elenco”</strong> acima da lista.
          </p>
        ) : null}

        {jaSouMembro && !isLider ? (
          <p className="text-center text-[10px] font-semibold text-eid-primary-300">Você já faz parte desta formação.</p>
        ) : null}

        {!aceitaCand && !isLider && !jaSouMembro ? (
          <p className="text-center text-[10px] text-eid-text-secondary">Esta formação não está aceitando candidaturas agora.</p>
        ) : null}
      </div>
    </div>
  );
}
