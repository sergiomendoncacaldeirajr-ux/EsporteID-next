import type { SupabaseClient } from "@supabase/supabase-js";
import { DesafioEsporteRegrasModal } from "@/components/desafio/desafio-esporte-regras-modal";
import { DesafioImpactoResumo } from "@/components/desafio/desafio-impacto-resumo";
import { fetchIndividualRankingPreview } from "@/lib/desafio/fetch-impact-preview";
import { getMatchRankMonthlyLimitPerSport } from "@/lib/app-config/match-rank-monthly-limit";
import { getMatchRankCooldownMeses } from "@/lib/app-config/match-rank-cooldown";

type Props = {
  supabase: SupabaseClient;
  viewerId: string;
  opponentId: string;
  esporteId: number;
  esporteNome: string;
};

export async function DesafioStreamIndividualRankingImpact({
  supabase,
  viewerId,
  opponentId,
  esporteId,
  esporteNome,
}: Props) {
  const [rankPrevInd, limitesMensal, cooldownMeses, pendingLimitRow, autoAprovacaoRow] = await Promise.all([
    fetchIndividualRankingPreview(supabase, { viewerId, opponentId, esporteId }),
    getMatchRankMonthlyLimitPerSport(supabase),
    getMatchRankCooldownMeses(supabase),
    supabase.from("app_config").select("value_json").eq("key", "match_rank_pending_result_limit").maybeSingle(),
    supabase.from("app_config").select("value_json").eq("key", "match_resultado_autoaprovacao_horas").maybeSingle(),
  ]);
  if (!rankPrevInd) return null;
  const pendingLimit = (() => { const v = (pendingLimitRow?.data?.value_json as { limite?: unknown } | null)?.limite; const n = Number(v); return Number.isFinite(n) && n >= 1 ? Math.min(20, n) : 2; })();
  const autoAprovacaoHoras = (() => { const v = (autoAprovacaoRow?.data?.value_json as { horas?: unknown } | null)?.horas; const n = Number(v); return Number.isFinite(n) && n >= 1 ? Math.min(168, n) : 24; })();
  const config = { limitesMensal, cooldownMeses, pendingLimit, autoAprovacaoHoras };
  return (
    <>
      <DesafioImpactoResumo
        esporteNome={esporteNome}
        regras={rankPrevInd.regras}
        individual={rankPrevInd.perspective}
        className="!mt-0"
      />
      <DesafioEsporteRegrasModal
        esporteId={esporteId}
        esporteNome={esporteNome}
        modalidade="individual"
        pontosVitoria={rankPrevInd.regras.pontos_vitoria}
        pontosDerrota={rankPrevInd.regras.pontos_derrota}
        config={config}
      />
    </>
  );
}
