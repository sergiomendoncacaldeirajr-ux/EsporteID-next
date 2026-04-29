"use client";

import Image from "next/image";
import { ProfileEditDrawerTrigger } from "@/components/perfil/profile-edit-drawer-trigger";
import { FormacaoCandidaturaCta } from "@/components/times/formacao-candidatura-cta";
import { ProfileEidPerformanceSeal } from "@/components/perfil/profile-eid-performance-seal";
import { ModalidadeGlyphIcon, SportGlyphIcon } from "@/lib/perfil/formacao-glyphs";
import { EidCityState } from "@/components/ui/eid-city-state";

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
  "rounded-full border px-2 py-[3px] text-[8px] font-black uppercase tracking-[0.05em] text-eid-fg";

function VagasChairIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="h-3.5 w-3.5" fill="currentColor">
      <rect x="4.2" y="2.2" width="5.2" height="4.1" rx="1" />
      <rect x="3.3" y="7" width="9.4" height="3.3" rx="1" />
      <rect x="4.1" y="10.3" width="1.4" height="3.1" rx=".5" />
      <rect x="10.5" y="10.3" width="1.4" height="3.1" rx=".5" />
    </svg>
  );
}

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
    <div className="group relative overflow-hidden rounded-[26px] border border-[color:color-mix(in_srgb,var(--eid-border-subtle)_80%,var(--eid-primary-500)_20%)] bg-[linear-gradient(165deg,color-mix(in_srgb,var(--eid-card)_96%,white_4%),color-mix(in_srgb,var(--eid-surface)_93%,var(--eid-bg)_7%))] p-2 shadow-[0_16px_34px_-26px_rgba(37,99,235,0.42)] transition duration-300 hover:border-eid-primary-500/40 sm:p-3">
      <div className="relative flex gap-2.5 sm:gap-3">
        <div className="relative mt-1 h-[4.5rem] w-[4.5rem] shrink-0 sm:mt-1.5 sm:h-[5rem] sm:w-[5rem]">
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
                className="h-full w-full rounded-[20px] border border-eid-primary-500/30 object-cover shadow-[0_8px_24px_-14px_rgba(15,23,42,0.35)]"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-[20px] border border-eid-primary-500/35 bg-eid-surface text-lg font-black text-eid-fg">
                {tipoLabel.slice(0, 1)}
              </div>
            )}
          </ProfileEditDrawerTrigger>
          <div className="absolute -bottom-1 left-1/2 z-[2] -translate-x-1/2 scale-110">
            <ProfileEidPerformanceSeal notaEid={Number(team.eid_time ?? 0)} compact />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`${chip} border-[color:color-mix(in_srgb,var(--eid-border-subtle)_45%,var(--eid-primary-500)_55%)] bg-[color:color-mix(in_srgb,var(--eid-card)_88%,var(--eid-primary-500)_12%)]`}
            >
              <span className="inline-flex items-center gap-1 text-eid-primary-400 [&_svg]:h-3 [&_svg]:w-3">
                <ModalidadeGlyphIcon modalidade={String(team.tipo ?? "").trim().toLowerCase() === "time" ? "time" : "dupla"} />
                <span className="text-eid-primary-400">{tipoLabel}</span>
              </span>
            </span>
            {team.esporteNome ? (
              <span
                className={`${chip} border-[color:color-mix(in_srgb,var(--eid-border-subtle)_45%,var(--eid-action-500)_55%)] bg-[color:color-mix(in_srgb,var(--eid-card)_90%,var(--eid-action-500)_10%)]`}
              >
                <span className="inline-flex items-center gap-1 text-eid-action-300 [&_svg]:h-3 [&_svg]:w-3">
                  <SportGlyphIcon sportName={team.esporteNome} />
                  <span className="text-eid-action-300">{team.esporteNome}</span>
                </span>
              </span>
            ) : null}
            {aceitaCand ? (
              <span
                className={`${chip} border-[color:color-mix(in_srgb,rgb(5,150,105)_50%,var(--eid-border-subtle)_50%)] bg-[color:color-mix(in_srgb,var(--eid-surface)_90%,rgb(16,185,129)_10%)] text-[rgb(22,128,93)]`}
              >
                Recrutando
              </span>
            ) : (
              <span className={`${chip} border-[color:var(--eid-border-subtle)] bg-eid-surface/90 text-eid-text-secondary`}>
                Sem vagas
              </span>
            )}
          </div>
          <h2 className="mt-2 line-clamp-2 text-[13px] font-black uppercase leading-[1.06] tracking-tight text-eid-fg sm:mt-2.5 sm:text-[16px]">
            {team.nome ?? "Formação"}
          </h2>
          <div className="mt-1 min-w-0">
            <EidCityState location={team.localizacao} align="start" />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1.5 text-[9px] text-eid-text-secondary">
            <span className="inline-flex items-center gap-1 rounded-full border border-[color:color-mix(in_srgb,var(--eid-action-500)_45%,var(--eid-border-subtle)_55%)] bg-[color:color-mix(in_srgb,var(--eid-action-500)_12%,var(--eid-card)_88%)] px-2 py-[3px] text-[8px] font-black uppercase tracking-[0.03em] text-eid-action-300">
              <VagasChairIcon />
              {vagasLabel}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--eid-border-subtle)] bg-[color:color-mix(in_srgb,var(--eid-surface)_65%,var(--eid-card)_35%)] px-2 py-[3px] text-[8px] font-semibold text-eid-text-secondary">
              <svg viewBox="0 0 16 16" className="h-3 w-3" fill="currentColor" aria-hidden>
                <rect x="2" y="8.7" width="2.6" height="5.1" rx=".5" />
                <rect x="6.7" y="5.8" width="2.6" height="8" rx=".5" />
                <rect x="11.4" y="3" width="2.6" height="10.8" rx=".5" />
              </svg>
              <span>Nível: {team.nivel_procurado?.trim() ? team.nivel_procurado : "a definir"}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="relative mt-2.5 flex flex-col gap-1.5 border-t border-[color:color-mix(in_srgb,var(--eid-border-subtle)_80%,transparent)] pt-2.5">
        {!isLider ? (
          <div className="[&_button]:!min-h-[36px] [&_button]:!rounded-[14px] [&_button]:!text-[9px] [&_button]:!tracking-[0.02em] sm:[&_button]:!min-h-[40px] sm:[&_button]:!text-[10px]">
            <FormacaoCandidaturaCta
              timeId={team.id}
              vagasAbertas={team.vagas_abertas}
              aceitaPedidos={team.aceita_pedidos}
              vagasDisponiveis={team.vagas_disponiveis}
              minhaCandidaturaPendenteId={minhaCandidaturaPendenteId}
              jaSouMembro={jaSouMembro}
              submitLabel="CANDIDATAR"
            />
          </div>
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
          className="inline-flex min-h-[36px] w-full items-center justify-center gap-1.5 rounded-[14px] border border-eid-primary-500/25 bg-eid-card px-2.5 text-center text-[9px] font-black uppercase tracking-[0.02em] text-eid-primary-400 transition hover:bg-eid-primary-500/8 sm:min-h-[40px] sm:text-[10px]"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M3 12a9 9 0 1 0 3-6.7" />
            <path d="M3 4v5h5" />
          </svg>
          Ver perfil da formação
        </ProfileEditDrawerTrigger>
      </div>
    </div>
  );
}
