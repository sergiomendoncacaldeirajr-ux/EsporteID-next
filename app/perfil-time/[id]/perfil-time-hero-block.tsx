import Link from "next/link";
import { FormacaoCidadeAvisoLider } from "@/components/perfil/formacao-cidade-aviso-lider";
import { ModalidadeGlyphIcon, SportGlyphIcon } from "@/lib/perfil/formacao-glyphs";
import { PROFILE_HERO_PANEL_CLASS } from "@/components/perfil/profile-ui-tokens";
import { EidCityState } from "@/components/ui/eid-city-state";
import { ExcluirFormacaoButton } from "@/components/times/excluir-formacao-button";
import { SairDaEquipeExitButton } from "@/components/times/sair-da-equipe-exit-button";
import { getPerfilTimePayload } from "./perfil-time-payload";

export type PerfilTimeHeroBlockProps = {
  timeId: number;
  viewerId: string;
  sairEquipeAction: () => Promise<void>;
};

export async function PerfilTimeHeroBlock({ timeId, viewerId, sairEquipeAction }: PerfilTimeHeroBlockProps) {
  const p = await getPerfilTimePayload(timeId, viewerId);
  const {
    id,
    t,
    criador,
    vitoriasTime,
    derrotasTime,
    winRateTime,
    jogosTime,
    canLeaveTeam,
    isLeader,
    podeExcluirPerfilFormacao,
    modalidade,
  } = p;

  return (
    <div className={`${PROFILE_HERO_PANEL_CLASS} mt-2 p-3 sm:p-4`}>
      {canLeaveTeam || (isLeader && podeExcluirPerfilFormacao) ? (
        <div className="absolute right-2 top-2 z-10 flex flex-col items-end gap-1.5 sm:right-3 sm:top-3">
          {isLeader && podeExcluirPerfilFormacao ? (
            <ExcluirFormacaoButton
              timeId={id}
              formationName={t.nome ?? "Formação"}
              formacaoTipo={modalidade === "dupla" ? "dupla" : "time"}
              redirectAfter={p.excluirRedirectPara}
              variant="compact"
            />
          ) : null}
          {canLeaveTeam ? (
            <SairDaEquipeExitButton
              leaveAction={sairEquipeAction}
              formationName={t.nome ?? "Formação"}
              formacaoTipo={modalidade === "dupla" ? "dupla" : "time"}
            />
          ) : null}
        </div>
      ) : null}
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-5">
        <div className="flex shrink-0 flex-col items-center sm:items-start">
          {t.escudo ? (
            <img
              src={t.escudo}
              alt=""
              className="h-24 w-24 rounded-2xl border-2 border-eid-action-500/50 object-cover shadow-lg sm:h-28 sm:w-28"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-eid-primary-500/40 bg-eid-surface text-sm font-bold text-eid-primary-300 sm:h-28 sm:w-28">
              {(t.tipo ?? "T").toUpperCase().slice(0, 1)}
            </div>
          )}
        </div>
        <div
          className={`flex w-full min-w-0 flex-1 flex-col items-center space-y-2 text-center sm:items-start sm:text-left ${canLeaveTeam ? "pr-10 sm:pr-12" : ""}`}
        >
          <span className="inline-block rounded-full border border-eid-primary-500/35 bg-eid-primary-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-eid-primary-300">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1">
                <ModalidadeGlyphIcon modalidade={String(t.tipo ?? "").trim().toLowerCase() === "time" ? "time" : "dupla"} />
                <span>{(t.tipo ?? "time").toUpperCase()}</span>
              </span>
              <span aria-hidden className="opacity-70">
                |
              </span>
              <span className="inline-flex items-center gap-1">
                <SportGlyphIcon sportName={p.esp?.nome} />
                <span>{p.esp?.nome ?? "Esporte"}</span>
              </span>
            </span>
          </span>
          <h1 className="text-xl font-bold uppercase tracking-tight text-eid-fg sm:text-2xl">{t.nome ?? "Formação"}</h1>
          <div className="flex w-full justify-center sm:hidden">
            <EidCityState location={t.localizacao} align="center" />
          </div>
          <div className="hidden w-full sm:block">
            <EidCityState location={t.localizacao} align="start" />
          </div>
        </div>
      </div>
      {isLeader ? <FormacaoCidadeAvisoLider timeId={id} /> : null}
      {t.bio ? <p className="mt-2 text-xs leading-relaxed text-eid-text-secondary sm:mt-3">{t.bio}</p> : null}
      <div className="mt-4 grid grid-cols-4 divide-x divide-transparent rounded-xl border border-transparent bg-eid-surface/40 text-center shadow-none">
        <div className="py-2">
          <p className="text-sm font-black text-eid-fg">{vitoriasTime}</p>
          <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Vitórias</p>
        </div>
        <div className="py-2">
          <p className="text-sm font-black text-eid-fg">{derrotasTime}</p>
          <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Derrotas</p>
        </div>
        <div className="py-2">
          <p className="text-sm font-black text-eid-action-500">{winRateTime != null ? `${winRateTime}%` : "—"}</p>
          <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Win Rate</p>
        </div>
        <div className="py-2">
          <p className="text-sm font-black text-eid-primary-400">{jogosTime}</p>
          <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Jogos</p>
        </div>
      </div>

      {criador ? (
        <div className="mt-4 flex w-full min-w-0 flex-col items-center gap-3 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/35 px-3 py-2.5">
          <Link
            href={`/perfil/${criador.id}?from=/perfil-time/${id}`}
            className="inline-flex max-w-full min-w-0 items-center gap-3 rounded-lg text-left transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eid-primary-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-eid-card"
            aria-label={`Abrir perfil de ${criador.nome ?? "líder"}`}
          >
            {criador.avatar_url ? (
              <img
                src={criador.avatar_url}
                alt=""
                className="h-9 w-9 shrink-0 rounded-full border border-[color:var(--eid-border-subtle)] object-cover sm:h-10 sm:w-10"
              />
            ) : (
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface text-[11px] font-black text-eid-primary-300 sm:h-10 sm:w-10">
                {(criador.nome ?? "L").trim().slice(0, 1).toUpperCase() || "L"}
              </span>
            )}
            <div className="min-w-0">
              <span className="block text-[10px] font-bold uppercase tracking-wide text-eid-text-secondary/90">Líder</span>
              <span className="font-semibold text-eid-primary-300 underline-offset-2 hover:underline">{criador.nome ?? "—"}</span>
            </div>
          </Link>
        </div>
      ) : null}
    </div>
  );
}
