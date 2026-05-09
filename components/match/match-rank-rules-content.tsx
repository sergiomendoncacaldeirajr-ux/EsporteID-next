export type MatchRulesConfig = {
  limitesMensal: number;
  cooldownMeses: number;
  pendingLimit: number;
  autoAprovacaoHoras: number;
};

export const MATCH_RULES_CONFIG_DEFAULT: MatchRulesConfig = {
  limitesMensal: 4,
  cooldownMeses: 12,
  pendingLimit: 2,
  autoAprovacaoHoras: 24,
};

function IconCalendar() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="h-4 w-4 shrink-0" aria-hidden>
      <rect x="2" y="2.5" width="12" height="11" rx="2" />
      <path d="M2 6.5h12M5.5 1v3M10.5 1v3" />
    </svg>
  );
}

function IconRepeat() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0" aria-hidden>
      <path d="M2.5 5.5h9a2 2 0 0 1 2 2v1" />
      <path d="M13.5 10.5H4.5a2 2 0 0 1-2-2v-1" />
      <path d="M10.5 3l2.5 2.5-2.5 2.5M5.5 13 3 10.5 5.5 8" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="h-4 w-4 shrink-0" aria-hidden>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 5v3.5l2 1.5" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0" aria-hidden>
      <circle cx="8" cy="8" r="6" />
      <path d="M5.5 8l2 2 3-3" />
    </svg>
  );
}

type RulePillProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
};

function RulePill({ icon, label, value, sub }: RulePillProps) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-eid-primary-500/20 bg-eid-primary-500/[0.06] px-3 py-2.5">
      <span className="mt-0.5 shrink-0 text-eid-primary-400">{icon}</span>
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">{label}</p>
        <p className="text-[15px] font-black leading-tight text-eid-fg">{value}</p>
        <p className="mt-0.5 text-[10px] leading-snug text-eid-text-secondary">{sub}</p>
      </div>
    </div>
  );
}

export function MatchRankRulesBullets({ config = MATCH_RULES_CONFIG_DEFAULT }: { config?: MatchRulesConfig }) {
  return (
    <div className="space-y-2.5">
      {/* Dynamic config stats */}
      <div className="grid grid-cols-2 gap-2">
        <RulePill
          icon={<IconCalendar />}
          label="Limite mensal"
          value={`${config.limitesMensal} partida${config.limitesMensal !== 1 ? "s" : ""}`}
          sub="por esporte e modalidade"
        />
        <RulePill
          icon={<IconRepeat />}
          label="Revanche"
          value={`${config.cooldownMeses} ${config.cooldownMeses === 1 ? "mês" : "meses"}`}
          sub="carência com o mesmo par"
        />
        <RulePill
          icon={<IconClock />}
          label="Pendentes"
          value={`até ${config.pendingLimit}`}
          sub="resultados aguardando ao mesmo tempo"
        />
        <RulePill
          icon={<IconCheck />}
          label="Auto-aprovação"
          value={`${config.autoAprovacaoHoras}h`}
          sub="sem contestação do adversário"
        />
      </div>

      {/* Static secondary rules */}
      <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/30 px-3 py-2.5">
        <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Também vale saber</p>
        <ul className="space-y-1.5 text-[11px] leading-snug text-eid-text-secondary">
          <li className="flex items-baseline gap-1.5">
            <span className="shrink-0 text-eid-primary-400">↗</span>
            Bônus de até <span className="font-semibold text-eid-fg">20%</span> ao vencer adversário com mais pontos no ranking
          </li>
          <li className="flex items-baseline gap-1.5">
            <span className="shrink-0 text-eid-primary-400">↗</span>
            Cada esporte tem ranking próprio — <span className="font-semibold text-eid-fg">individual, dupla e time</span> são modalidades separadas
          </li>
          <li className="flex items-baseline gap-1.5">
            <span className="shrink-0 text-eid-primary-400">↗</span>
            Em dupla e time, somente o <span className="font-semibold text-eid-fg">capitão</span> aceita ou recusa o desafio
          </li>
        </ul>
      </div>
    </div>
  );
}

export function MatchRankRulesFooterTip() {
  return (
    <div className="mt-2.5 flex items-start gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-2.5 py-2 text-[10px] leading-snug text-amber-300/90">
      <span className="shrink-0">💡</span>
      <span>Se não houver acordo de data após o aceite, você pode cancelar e solicitar o desafio novamente depois.</span>
    </div>
  );
}
