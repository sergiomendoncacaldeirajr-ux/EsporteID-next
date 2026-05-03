import type { SupabaseClient } from "@supabase/supabase-js";
import { DesafioEsporteRegrasModal } from "@/components/desafio/desafio-esporte-regras-modal";
import { DesafioImpactoResumo } from "@/components/desafio/desafio-impacto-resumo";
import { fetchIndividualRankingPreview } from "@/lib/desafio/fetch-impact-preview";

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
  const rankPrevInd = await fetchIndividualRankingPreview(supabase, {
    viewerId,
    opponentId,
    esporteId,
  });
  if (!rankPrevInd) return null;
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
      />
    </>
  );
}
