import type { SupabaseClient } from "@supabase/supabase-js";
import { DesafioEsporteRegrasModal } from "@/components/desafio/desafio-esporte-regras-modal";
import { DesafioImpactoResumo } from "@/components/desafio/desafio-impacto-resumo";
import { fetchColetivoRankingPreview } from "@/lib/desafio/fetch-impact-preview";
import { getMatchRankMonthlyLimitPerSport } from "@/lib/app-config/match-rank-monthly-limit";
import { getMatchRankCooldownMeses } from "@/lib/app-config/match-rank-cooldown";

type Props = {
  supabase: SupabaseClient;
  viewerUserId: string;
  opponentTeamId: number;
  esporteId: number;
  esporteNome: string;
  modalidade: "dupla" | "time";
};

export async function DesafioStreamColetivoRankingImpact({
  supabase,
  viewerUserId,
  opponentTeamId,
  esporteId,
  esporteNome,
  modalidade,
}: Props) {
  const [rankPrevCo, limitesMensal, cooldownMeses, pendingLimitRow, autoAprovacaoRow] = await Promise.all([
    fetchColetivoRankingPreview(supabase, { viewerUserId, opponentTeamId, esporteId, modalidade }),
    getMatchRankMonthlyLimitPerSport(supabase),
    getMatchRankCooldownMeses(supabase),
    supabase.from("app_config").select("value_json").eq("key", "match_rank_pending_result_limit").maybeSingle(),
    supabase.from("app_config").select("value_json").eq("key", "match_resultado_autoaprovacao_horas").maybeSingle(),
  ]);
  if (!rankPrevCo) return null;
  const pendingLimit = (() => { const v = (pendingLimitRow?.data?.value_json as { limite?: unknown } | null)?.limite; const n = Number(v); return Number.isFinite(n) && n >= 1 ? Math.min(20, n) : 2; })();
  const autoAprovacaoHoras = (() => { const v = (autoAprovacaoRow?.data?.value_json as { horas?: unknown } | null)?.horas; const n = Number(v); return Number.isFinite(n) && n >= 1 ? Math.min(168, n) : 24; })();
  const config = { limitesMensal, cooldownMeses, pendingLimit, autoAprovacaoHoras };
  return (
    <>
      <DesafioImpactoResumo
        esporteNome={esporteNome}
        regras={rankPrevCo.regras}
        coletivo={rankPrevCo.coletivo}
        className="!mt-0"
      />
      <DesafioEsporteRegrasModal
        esporteId={esporteId}
        esporteNome={esporteNome}
        modalidade={modalidade}
        pontosVitoria={rankPrevCo.regras.pontos_vitoria}
        pontosDerrota={rankPrevCo.regras.pontos_derrota}
        config={config}
      />
    </>
  );
}
