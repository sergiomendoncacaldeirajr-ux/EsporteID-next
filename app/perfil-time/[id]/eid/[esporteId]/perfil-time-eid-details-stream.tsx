import { FormacaoEidEsporteDetailsBlocks } from "@/components/perfil/formacao-eid-esporte-view";
import {
  carregarHistoricoNotasColetivo,
  carregarPartidasColetivasDoTime,
  mapDetalhesTimesAdversarios,
  mapTorneioNomes,
} from "@/lib/perfil/formacao-eid-stats";
import { createClient } from "@/lib/supabase/server";
import { loadPerfilTimeEidSession, type PerfilTimeEidRouteInput } from "./perfil-time-eid-session";

export async function PerfilTimeEidDetailsStream(props: PerfilTimeEidRouteInput) {
  const s = await loadPerfilTimeEidSession(props);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { t } = s;
  const partidas = await carregarPartidasColetivasDoTime(supabase, s.timeId, s.esporteId, user.id);
  const historicoNotas = await carregarHistoricoNotasColetivo(supabase, s.timeId);
  const torneioNome = await mapTorneioNomes(supabase, partidas);
  const oponenteDetalhes = await mapDetalhesTimesAdversarios(supabase, s.timeId, partidas);
  const linkPerfilFormacao = `/perfil-time/${s.timeId}?from=${encodeURIComponent(s.nextPath)}`;

  return (
    <FormacaoEidEsporteDetailsBlocks
      nomeEsporte={s.nomeEsporte}
      titulo={t.nome ?? "Formação"}
      eidTime={Number(t.eid_time ?? 0)}
      pontosRanking={Number(t.pontos_ranking ?? 0)}
      partidasListadoCountLabel={partidas.length}
      partidas={partidas}
      historicoNotas={historicoNotas}
      torneioNome={torneioNome}
      oponenteDetalhes={oponenteDetalhes}
      timeId={s.timeId}
      nextPath={s.nextPath}
      linkPerfilFormacao={linkPerfilFormacao}
      formacaoEscudoUrl={t.escudo ?? null}
      formacaoTipoLabel={s.tipoLabel}
    />
  );
}
