"use client";

import { RulesDismissModal } from "@/components/ui/rules-dismiss-modal";
import { MatchRankRulesBullets, MatchRankRulesFooterTip } from "@/components/match/match-rank-rules-content";

export type DesafioEsporteRegrasModalProps = {
  esporteId: number;
  esporteNome: string;
  modalidade: "individual" | "dupla" | "time";
  pontosVitoria: number;
  pontosDerrota: number;
};

function modalidadeLabel(m: DesafioEsporteRegrasModalProps["modalidade"]) {
  if (m === "dupla") return "dupla";
  if (m === "time") return "time";
  return "individual";
}

export function desafioRankRegrasHideKey(esporteId: number, modalidade: DesafioEsporteRegrasModalProps["modalidade"]) {
  return `eid_desafio_rank_regras_hide:v1:${esporteId}:${modalidade}`;
}

export function DesafioEsporteRegrasModal({
  esporteId,
  esporteNome,
  modalidade,
  pontosVitoria,
  pontosDerrota,
}: DesafioEsporteRegrasModalProps) {
  const key = desafioRankRegrasHideKey(esporteId, modalidade);
  const title = `Regras de ranking · ${esporteNome}`;

  return (
    <RulesDismissModal permanentHideStorageKey={key} title={title}>
      <p className="text-[11px] leading-snug text-eid-text-secondary sm:text-xs">
        Modalidade: <span className="font-semibold text-eid-fg">{modalidadeLabel(modalidade)}</span>. Neste esporte, a vitória soma até{" "}
        <span className="font-semibold text-eid-fg">{pontosVitoria} pts</span> de base no ranking de desafio (pode haver bônus ao vencer quem tem
        mais pontos). Em caso de derrota no ranking de desafio, a perda é de{" "}
        <span className="font-semibold text-eid-fg">{pontosDerrota} pts</span>.
      </p>
      <p className="mt-2 text-[11px] font-semibold text-eid-fg sm:text-xs">Regras gerais</p>
      <MatchRankRulesBullets />
      <MatchRankRulesFooterTip />
    </RulesDismissModal>
  );
}
