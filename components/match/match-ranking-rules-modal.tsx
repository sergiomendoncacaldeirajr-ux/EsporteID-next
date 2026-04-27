"use client";

import { RulesDismissModal } from "@/components/ui/rules-dismiss-modal";
import { MatchRankRulesBullets, MatchRankRulesFooterTip } from "@/components/match/match-rank-rules-content";

/** Mesma chave em /match e /ranking: oculta o aviso geral de regras de ranking para este dispositivo. */
export const MATCH_RANK_RULES_HIDE_FOREVER_KEY = "eid_match_rank_rules_hide_forever_v1";

export function MatchRankingRulesModal() {
  return (
    <RulesDismissModal permanentHideStorageKey={MATCH_RANK_RULES_HIDE_FOREVER_KEY} title="Como funciona o Desafio de ranking">
      <MatchRankRulesBullets />
      <MatchRankRulesFooterTip />
    </RulesDismissModal>
  );
}
