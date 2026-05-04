import Link from "next/link";
import { FormacaoEidEsporteHeroStrip } from "@/components/perfil/formacao-eid-esporte-view";
import { PerfilBackLink } from "@/components/perfil/perfil-back-link";
import { PROFILE_CARD_BASE, PROFILE_HERO_PANEL_CLASS } from "@/components/perfil/profile-ui-tokens";
import { loadPerfilDuplaEidSession, type PerfilDuplaEidRouteInput } from "./perfil-dupla-eid-session";

export async function PerfilDuplaEidHeroStream(props: PerfilDuplaEidRouteInput) {
  const s = await loadPerfilDuplaEidSession(props);

  if (s.kind === "no_team") {
    const d = s.dupla;
    return (
      <>
        <PerfilBackLink href={s.backHref} label="Voltar" />
        <div className={`mt-4 p-4 ${PROFILE_HERO_PANEL_CLASS}`}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-eid-action-500">Dupla · {s.nomeEsporte}</p>
          <h1 className="mt-1 text-lg font-black text-eid-fg">Dupla #{s.duplaId}</h1>
          {d.username ? <p className="text-xs text-eid-primary-300">@{d.username}</p> : null}
          <p className="mt-3 text-sm text-eid-text-secondary">
            Ainda não há um <strong className="text-eid-fg">time de dupla ativo</strong> no ranking com os dois atletas neste
            esporte. As estatísticas de EID em equipe aparecem quando a formação existir no radar.
          </p>
          <Link
            href={s.linkPerfilDupla}
            className="mt-4 inline-flex text-sm font-semibold text-eid-primary-400 hover:underline"
          >
            ← Ver perfil da dupla
          </Link>
        </div>
      </>
    );
  }

  if (s.kind === "bad_team") {
    return (
      <>
        <PerfilBackLink href={s.backHref} label="Voltar" />
        <div className={`mt-4 p-4 ${PROFILE_CARD_BASE} border-amber-500/30`}>
          <p className="text-sm text-eid-text-secondary">
            O time vinculado a esta dupla está em outro esporte ou foi alterado. Abra o{" "}
            <Link href={s.linkPerfilDupla} className="font-semibold text-eid-primary-400 underline">
              perfil da dupla
            </Link>{" "}
            para conferir.
          </p>
        </div>
      </>
    );
  }

  const { t } = s;

  return (
    <FormacaoEidEsporteHeroStrip
      backHref={s.backHref}
      nomeEsporte={s.nomeEsporte}
      titulo={t.nome ?? "Dupla"}
      subtitulo={s.subtitulo}
      escudoUrl={t.escudo}
      escudoFallbackLetter="D"
      tipoLabel="Dupla"
      eidTime={Number(t.eid_time ?? 0)}
      pontosRanking={Number(t.pontos_ranking ?? 0)}
      posicaoRank={s.posicao}
      partidasListadoCount={null}
      omitPartidasListadoTile
      linkPerfilFormacao={s.linkPerfilDupla}
      duplaRegistroLinks={[{ id: s.duplaId, href: s.linkPerfilDupla }]}
      showBackLink={!s.isEmbed}
    />
  );
}
