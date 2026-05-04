import { FormacaoEidEsporteHeroStrip } from "@/components/perfil/formacao-eid-esporte-view";
import { loadPerfilTimeEidSession, type PerfilTimeEidRouteInput } from "./perfil-time-eid-session";

export async function PerfilTimeEidHeroStream(props: PerfilTimeEidRouteInput) {
  const s = await loadPerfilTimeEidSession(props);
  const { t } = s;

  return (
    <FormacaoEidEsporteHeroStrip
      backHref={s.backHref}
      nomeEsporte={s.nomeEsporte}
      titulo={t.nome ?? "Formação"}
      subtitulo={t.username ? `@${t.username}` : null}
      escudoUrl={t.escudo}
      escudoFallbackLetter={(t.tipo ?? "T").toUpperCase().slice(0, 1)}
      tipoLabel={s.tipoLabel}
      eidTime={Number(t.eid_time ?? 0)}
      pontosRanking={Number(t.pontos_ranking ?? 0)}
      posicaoRank={s.posicao}
      partidasListadoCount={null}
      omitPartidasListadoTile
      linkPerfilFormacao={s.linkPerfil}
      showBackLink={!s.isEmbed}
    />
  );
}
