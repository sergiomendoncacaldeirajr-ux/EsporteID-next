import type { SupabaseClient } from "@supabase/supabase-js";
import { DesafioEsporteRegrasModal } from "@/components/desafio/desafio-esporte-regras-modal";
import { DesafioImpactoResumo } from "@/components/desafio/desafio-impacto-resumo";
import { fetchColetivoRankingPreview } from "@/lib/desafio/fetch-impact-preview";

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
  const rankPrevCo = await fetchColetivoRankingPreview(supabase, {
    viewerUserId,
    opponentTeamId,
    esporteId,
    modalidade,
  });
  if (!rankPrevCo) return null;
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
      />
    </>
  );
}
