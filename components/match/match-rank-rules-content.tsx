export function MatchRankRulesBullets() {
  return (
    <ul className="space-y-1.5 text-[11px] leading-snug text-eid-text-secondary sm:text-xs">
      <li>
        - O ranking considera confrontos válidos na janela de <span className="font-semibold text-eid-fg">12 meses</span>.
      </li>
      <li>
        - Cada esporte possui ranking próprio (individual, dupla e time são separados por modalidade).
      </li>
      <li>
        - Vitória pode incluir <span className="font-semibold text-eid-fg">bônus</span> ao superar adversário com mais pontos no ranking (até cerca de 20% sobre a base do esporte).
      </li>
      <li>
        - Cada jogador pode manter até <span className="font-semibold text-eid-fg">2 jogos pendentes</span> de resultado.
      </li>
      <li>
        - Resultado pendente pode ser autoaprovado em <span className="font-semibold text-eid-fg">24h</span>, se não houver contestação.
      </li>
      <li>
        - Em dupla ou time, somente o <span className="font-semibold text-eid-fg">capitão</span> aceita o desafio; os demais participantes apenas sugerem.
      </li>
    </ul>
  );
}

export function MatchRankRulesFooterTip() {
  return (
    <p className="mt-2 text-[10px] text-eid-text-secondary">
      Dica: se não houver acordo de data após o aceite, você pode cancelar e solicitar novamente depois.
    </p>
  );
}
