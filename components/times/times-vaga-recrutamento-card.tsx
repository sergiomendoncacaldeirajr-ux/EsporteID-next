"use client";

import Image from "next/image";
import { ProfileEditDrawerTrigger } from "@/components/perfil/profile-edit-drawer-trigger";
import { FormacaoCandidaturaCta } from "@/components/times/formacao-candidatura-cta";
import { ProfileEidPerformanceSeal } from "@/components/perfil/profile-eid-performance-seal";
import { DESAFIO_FLOW_SECONDARY_CLASS } from "@/lib/desafio/flow-ui";
import { ModalidadeGlyphIcon, SportGlyphIcon } from "@/lib/perfil/formacao-glyphs";

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
  vagas_disponiveis: number | null;
  criador_id: string;
};

const chip =
  "rounded-full border px-2 py-px text-[8px] font-black uppercase tracking-[0.08em] text-eid-fg";

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
  const isLider = team.criador_id === viewerUserId;
  const aceitaCand = Boolean(team.vagas_abertas && team.aceita_pedidos);
  const tipoLabel = String(team.tipo ?? "time").toLowerCase() === "dupla" ? "Dupla" : "Time";
  const vagasLabel =
    team.vagas_disponiveis == null
      ? "Vagas abertas"
      : team.vagas_disponiveis === 1
        ? "1 vaga"
        : `${team.vagas_disponiveis} vagas`;
  const perfilHref = `/perfil-time/${team.id}?from=/times`;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-[color:color-mix(in_srgb,var(--eid-border-subtle)_82%,var(--eid-primary-500)_18%)] bg-[linear-gradient(165deg,color-mix(in_srgb,var(--eid-card)_92%,var(--eid-primary-500)_8%),color-mix(in_srgb,var(--eid-surface)_88%,var(--eid-bg)_12%))] p-3 shadow-[0_14px_40px_-28px_rgba(37,99,235,0.55)] transition duration-300 hover:border-eid-primary-500/45 hover:shadow-[0_20px_48px_-24px_rgba(37,99,235,0.42)] sm:p-4">
      <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-eid-action-500/12 blur-2xl transition duration-500 group-hover:bg-eid-action-500/18" aria-hidden />
      <div className="relative flex gap-3">
        <div className="relative h-[4.25rem] w-[4.25rem] shrink-0 sm:h-[4.75rem] sm:w-[4.75rem]">
          <ProfileEditDrawerTrigger
            href={perfilHref}
            title={team.nome ?? "Formação"}
            fullscreen
            topMode="backOnly"
            className="block h-full w-full transition hover:-translate-y-[1px]"
          >
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
              <div className="flex h-full w-full items-center justify-center rounded-2xl border-2 border-eid-primary-500/40 bg-eid-surface text-lg font-black text-eid-fg">
                {tipoLabel.slice(0, 1)}
              </div>
            )}
          </ProfileEditDrawerTrigger>
          <div className="absolute -bottom-1 left-1/2 z-[2] -translate-x-1/2">
            <ProfileEidPerformanceSeal notaEid={Number(team.eid_time ?? 0)} compact />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`${chip} border-[color:color-mix(in_srgb,var(--eid-border-subtle)_45%,var(--eid-primary-500)_55%)] bg-[color:color-mix(in_srgb,var(--eid-card)_88%,var(--eid-primary-500)_12%)]`}
            >
              <span className="inline-flex items-center gap-1">
                <ModalidadeGlyphIcon modalidade={String(team.tipo ?? "").trim().toLowerCase() === "time" ? "time" : "dupla"} />
                <span>{tipoLabel}</span>
              </span>
            </span>
            {team.esporteNome ? (
              <span
                className={`${chip} border-[color:color-mix(in_srgb,var(--eid-border-subtle)_45%,var(--eid-action-500)_55%)] bg-[color:color-mix(in_srgb,var(--eid-card)_90%,var(--eid-action-500)_10%)]`}
              >
                <span className="inline-flex items-center gap-1">
                  <SportGlyphIcon sportName={team.esporteNome} />
                  <span>{team.esporteNome}</span>
                </span>
              </span>
            ) : null}
            {aceitaCand ? (
              <span
                className={`${chip} border-[color:color-mix(in_srgb,rgb(5,150,105)_55%,var(--eid-border-subtle)_45%)] bg-[color:color-mix(in_srgb,var(--eid-surface)_88%,rgb(16,185,129)_12%)]`}
              >
                Recrutando
              </span>
            ) : (
              <span className={`${chip} border-[color:var(--eid-border-subtle)] bg-eid-surface/90 text-eid-text-secondary`}>
                Sem vagas
              </span>
            )}
          </div>
          <h2 className="mt-1.5 line-clamp-2 text-sm font-black uppercase leading-tight tracking-tight text-eid-fg sm:text-base">
            {team.nome ?? "Formação"}
          </h2>
          <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-eid-text-secondary">{team.localizacao ?? "Localização não informada"}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-eid-text-secondary">
            <span className="inline-flex items-center rounded-full border border-eid-action-500/35 bg-eid-action-500/10 px-1.5 py-px text-[9px] font-black uppercase tracking-[0.08em] text-eid-action-300">
              {vagasLabel}
            </span>
            <span className="text-[color:var(--eid-border-subtle)]">·</span>
            <span>
              Nível: <span className="text-eid-fg/90">{team.nivel_procurado?.trim() ? team.nivel_procurado : "a definir"}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="relative mt-3 flex flex-col gap-2 border-t border-[color:color-mix(in_srgb,var(--eid-border-subtle)_75%,transparent)] pt-3">
        {!isLider ? (
          <FormacaoCandidaturaCta
            timeId={team.id}
            vagasAbertas={team.vagas_abertas}
            aceitaPedidos={team.aceita_pedidos}
            vagasDisponiveis={team.vagas_disponiveis}
            minhaCandidaturaPendenteId={minhaCandidaturaPendenteId}
            jaSouMembro={jaSouMembro}
          />
        ) : (
          <p className="rounded-xl border border-eid-primary-500/25 bg-eid-primary-500/8 px-3 py-2 text-center text-[10px] text-eid-text-secondary">
            Sua formação — pedidos de entrada aparecem em <strong className="text-eid-fg">Pedidos para o seu elenco</strong> acima.
          </p>
        )}

        <ProfileEditDrawerTrigger
          href={perfilHref}
          title={team.nome ?? "Formação"}
          fullscreen
          topMode="backOnly"
          className={DESAFIO_FLOW_SECONDARY_CLASS + " w-full"}
        >
          Ver perfil da formação
        </ProfileEditDrawerTrigger>
      </div>
    </div>
  );
}
