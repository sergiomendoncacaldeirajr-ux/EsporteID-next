"use client";

import { RulesDismissModal } from "@/components/ui/rules-dismiss-modal";
import {
  MATCH_RULES_CONFIG_DEFAULT,
  MatchRankRulesBullets,
  MatchRankRulesFooterTip,
  type MatchRulesConfig,
} from "@/components/match/match-rank-rules-content";

export type DesafioEsporteRegrasModalProps = {
  esporteId: number;
  esporteNome: string;
  modalidade: "individual" | "dupla" | "time";
  pontosVitoria: number;
  pontosDerrota: number;
  config?: MatchRulesConfig;
};

const MODALIDADE_LABEL: Record<DesafioEsporteRegrasModalProps["modalidade"], string> = {
  individual: "Individual",
  dupla: "Dupla",
  time: "Time",
};

export function desafioRankRegrasHideKey(esporteId: number, modalidade: DesafioEsporteRegrasModalProps["modalidade"]) {
  return `eid_desafio_rank_regras_hide:v1:${esporteId}:${modalidade}`;
}

export function DesafioEsporteRegrasModal({
  esporteId,
  esporteNome,
  modalidade,
  pontosVitoria,
  pontosDerrota,
  config = MATCH_RULES_CONFIG_DEFAULT,
}: DesafioEsporteRegrasModalProps) {
  const key = desafioRankRegrasHideKey(esporteId, modalidade);
  const title = `Regras de ranking · ${esporteNome}`;

  return (
    <RulesDismissModal permanentHideStorageKey={key} title={title}>
      {/* Sport + modality header */}
      <div className="mb-3 flex items-center gap-2">
        <span className="rounded-full border border-eid-primary-500/30 bg-eid-primary-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.07em] text-eid-primary-300">
          {esporteNome}
        </span>
        <span className="rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/60 px-2.5 py-0.5 text-[10px] font-semibold text-eid-text-secondary">
          {MODALIDADE_LABEL[modalidade]}
        </span>
      </div>

      {/* Win / loss points */}
      <div className="mb-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.07] px-3 py-2.5 text-center">
          <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-emerald-400/80">Vitória</p>
          <p className="text-[22px] font-black leading-tight text-emerald-300">+{pontosVitoria}</p>
          <p className="text-[9px] text-emerald-400/70">pts base + bônus até 20%</p>
        </div>
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.06] px-3 py-2.5 text-center">
          <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-rose-400/80">Derrota</p>
          <p className="text-[22px] font-black leading-tight text-rose-300">−{pontosDerrota}</p>
          <p className="text-[9px] text-rose-400/70">pts de perda no ranking</p>
        </div>
      </div>

      <MatchRankRulesBullets config={config} />
      <MatchRankRulesFooterTip />
    </RulesDismissModal>
  );
}
