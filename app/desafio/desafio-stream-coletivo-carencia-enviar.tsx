import type { SupabaseClient } from "@supabase/supabase-js";
import { DesafioEnviarForm } from "@/components/desafio/desafio-enviar-form";
import { computeRankingBlockedUntilColetivo } from "@/lib/match/coletivo-ranking-cooldown";
import { formatCooldownRemaining } from "@/lib/match/cooldown-remaining";

type Props = {
  supabase: SupabaseClient;
  viewerUserId: string;
  esporteId: number;
  modalidade: "dupla" | "time";
  meuTimeId: number | null;
  alvoTimeId: number;
  cooldownMeses: number;
  opponentLeaderId: string | null | undefined;
  canConfirmarRanking: boolean;
};

/**
 * Consulta de carência de ranking entre formações (e fallback legado) + formulário de envio,
 * fora do shell inicial da página para abrir o fullscreen mais rápido.
 */
export async function DesafioStreamColetivoCarenciaEnviar({
  supabase,
  viewerUserId,
  esporteId,
  modalidade,
  meuTimeId,
  alvoTimeId,
  cooldownMeses,
  opponentLeaderId,
  canConfirmarRanking,
}: Props) {
  const rankingBlockedUntilColetivo = await computeRankingBlockedUntilColetivo(supabase, {
    esporteId,
    modalidade,
    meuTimeId: meuTimeId != null && Number.isFinite(meuTimeId) && meuTimeId > 0 ? meuTimeId : null,
    alvoTimeId,
    cooldownMeses,
    fallbackViewerId: viewerUserId,
    fallbackOpponentLeaderId: opponentLeaderId ?? undefined,
  });

  return (
    <>
      {rankingBlockedUntilColetivo ? (
        <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/35 px-3 py-2 text-[11px] leading-relaxed text-eid-text-secondary">
          Carência ativa para desafio de ranking neste esporte ({modalidade}) até{" "}
          <span className="font-semibold text-eid-fg">
            {new Date(rankingBlockedUntilColetivo).toLocaleDateString("pt-BR")}
          </span>
          .{" "}
          <span className="font-semibold text-eid-fg">{formatCooldownRemaining(rankingBlockedUntilColetivo)}</span>
        </div>
      ) : null}
      {canConfirmarRanking && !rankingBlockedUntilColetivo ? (
        <DesafioEnviarForm
          modalidade={modalidade}
          esporteId={esporteId}
          alvoTimeId={alvoTimeId}
          finalidade="ranking"
          className="!mt-0"
        />
      ) : null}
    </>
  );
}
