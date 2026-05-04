import Link from "next/link";
import { ExcluirFormacaoButton } from "@/components/times/excluir-formacao-button";
import { FormacaoCidadeAvisoLider } from "@/components/perfil/formacao-cidade-aviso-lider";
import { ModalidadeGlyphIcon, SportGlyphIcon } from "@/lib/perfil/formacao-glyphs";
import { EidCityState } from "@/components/ui/eid-city-state";
import { getPerfilDuplaIdentity } from "./perfil-dupla-payload";

export type PerfilDuplaHeroIdentityProps = {
  duplaId: number;
  viewerId: string;
};

export async function PerfilDuplaHeroIdentity({ duplaId, viewerId }: PerfilDuplaHeroIdentityProps) {
  const p = await getPerfilDuplaIdentity(duplaId, viewerId);
  const {
    id: duplaPublicId,
    d,
    timeResolvido,
    timeResolvidoId,
    nomeExibicao,
    localExibicao,
    esp,
    podeExcluirPerfilDuplaTime,
    isDonoDupla,
  } = p;

  return (
    <>
      {podeExcluirPerfilDuplaTime && timeResolvidoId ? (
        <div className="absolute right-2 top-2 z-10 sm:right-3 sm:top-3">
          <ExcluirFormacaoButton
            timeId={timeResolvidoId}
            formationName={nomeExibicao}
            formacaoTipo="dupla"
            redirectAfter={p.excluirDuplaRedirectPara}
            variant="compact"
          />
        </div>
      ) : null}
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-5">
        <div className="flex shrink-0 flex-col items-center sm:items-start">
          {timeResolvido?.escudo ? (
            <img
              src={timeResolvido.escudo}
              alt=""
              className="h-24 w-24 rounded-2xl border-2 border-eid-action-500/50 object-cover shadow-lg sm:h-28 sm:w-28"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-eid-primary-500/40 bg-eid-surface text-sm font-black text-eid-primary-300 sm:h-28 sm:w-28">
              D
            </div>
          )}
        </div>
        <div className="flex w-full min-w-0 flex-1 flex-col items-center space-y-2 text-center sm:items-start sm:text-left">
          <span className="inline-block rounded-full border border-eid-primary-500/35 bg-eid-primary-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-eid-primary-300">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1">
                <ModalidadeGlyphIcon modalidade="dupla" />
                <span>DUPLA</span>
              </span>
              <span aria-hidden className="opacity-70">
                |
              </span>
              <span className="inline-flex items-center gap-1">
                <SportGlyphIcon sportName={esp?.nome} />
                <span>{esp?.nome ?? "Esporte"}</span>
              </span>
            </span>
          </span>
          <h1 className="text-xl font-bold uppercase tracking-tight text-eid-fg sm:text-2xl">{nomeExibicao}</h1>
          <div className="flex w-full justify-center sm:hidden">
            <EidCityState location={localExibicao} align="center" />
          </div>
          <div className="hidden w-full sm:block">
            <EidCityState location={localExibicao} align="start" />
          </div>
        </div>
      </div>
      {isDonoDupla && timeResolvidoId ? <FormacaoCidadeAvisoLider timeId={timeResolvidoId} /> : null}
      {d.bio ? <p className="mt-2 text-xs leading-relaxed text-eid-text-secondary sm:mt-3">{d.bio}</p> : null}

      {p.liderDupla ? (
        <div className="mt-4 flex w-full min-w-0 justify-center rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/35 px-3 py-2.5">
          <Link
            href={`/perfil/${p.liderDupla.id}?from=/perfil-dupla/${duplaPublicId}`}
            className="inline-flex max-w-full min-w-0 items-center gap-3 rounded-lg text-left transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eid-primary-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-eid-card"
            aria-label={`Abrir perfil de ${p.liderDupla.nome ?? "líder"}`}
          >
            {p.liderDupla.avatar_url ? (
              <img
                src={p.liderDupla.avatar_url}
                alt=""
                className="h-9 w-9 shrink-0 rounded-full border border-[color:var(--eid-border-subtle)] object-cover sm:h-10 sm:w-10"
              />
            ) : (
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface text-[11px] font-black text-eid-primary-300 sm:h-10 sm:w-10">
                {(p.liderDupla.nome ?? "L").trim().slice(0, 1).toUpperCase() || "L"}
              </span>
            )}
            <div className="min-w-0">
              <span className="block text-[10px] font-bold uppercase tracking-wide text-eid-text-secondary/90">Líder</span>
              <span className="font-semibold text-eid-primary-300 underline-offset-2 hover:underline">{p.liderDupla.nome ?? "—"}</span>
            </div>
          </Link>
        </div>
      ) : null}
    </>
  );
}
