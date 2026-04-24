import {
  adminSetSystemFeatureMode,
  adminSetMatchRankCooldownMeses,
  adminSetMatchRankPendingLimit,
  adminSetMatchResultadoAutoAprovacaoHoras,
} from "@/app/admin/actions";
import { SYSTEM_FEATURE_LABEL, type SystemFeatureKey } from "@/lib/system-features";
import { createServiceRoleClient, hasServiceRoleConfig } from "@/lib/supabase/service-role";

export default async function AdminRegrasPage() {
  if (!hasServiceRoleConfig()) {
    return <p className="text-sm text-eid-text-secondary">Configure a service role.</p>;
  }
  const db = createServiceRoleClient();
  const [rr, rrm, cooldownRow, pendingLimitRow, autoApproveRow, featureModesRow] = await Promise.all([
    db.from("regras_ranking").select("*, esportes(nome)").order("esporte_id", { ascending: true }).limit(100),
    db.from("regras_ranking_match").select("*, esportes(nome)").order("esporte_id", { ascending: true }).limit(100),
    db.from("app_config").select("value_json").eq("key", "match_rank_cooldown_meses").maybeSingle(),
    db.from("app_config").select("value_json").eq("key", "match_rank_pending_result_limit").maybeSingle(),
    db.from("app_config").select("value_json").eq("key", "match_resultado_autoaprovacao_horas").maybeSingle(),
    db.from("app_config").select("value_json").eq("key", "system_feature_modes_v1").maybeSingle(),
  ]);

  let cooldownMeses = 12;
  const cj = cooldownRow.data?.value_json;
  if (cj && typeof cj === "object" && !Array.isArray(cj) && "meses" in cj) {
    const n = Number((cj as { meses?: unknown }).meses);
    if (Number.isFinite(n) && n >= 1) cooldownMeses = Math.min(120, Math.floor(n));
  }
  let pendingLimit = 2;
  const pj = pendingLimitRow.data?.value_json;
  if (pj && typeof pj === "object" && !Array.isArray(pj) && "limite" in pj) {
    const n = Number((pj as { limite?: unknown }).limite);
    if (Number.isFinite(n) && n >= 1) pendingLimit = Math.min(20, Math.floor(n));
  }
  let autoApproveHoras = 24;
  const aj = autoApproveRow.data?.value_json;
  if (aj && typeof aj === "object" && !Array.isArray(aj) && "horas" in aj) {
    const n = Number((aj as { horas?: unknown }).horas);
    if (Number.isFinite(n) && n >= 1) autoApproveHoras = Math.min(168, Math.floor(n));
  }

  const featureKeys: SystemFeatureKey[] = [
    "marketplace",
    "locais",
    "torneios",
    "professores",
    "organizador_torneios",
  ];
  const rawFeatures =
    featureModesRow.data?.value_json &&
    typeof featureModesRow.data.value_json === "object" &&
    !Array.isArray(featureModesRow.data.value_json)
      ? ((featureModesRow.data.value_json as { features?: Record<string, unknown> }).features ?? {})
      : {};

  return (
    <div className="space-y-10">
      <section className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/50 p-4">
        <h2 className="text-base font-bold text-eid-fg">Modos de funcionalidades do sistema</h2>
        <p className="mt-1 text-sm text-eid-text-secondary">
          Estados: <strong>ativo</strong> (todos), <strong>em_breve</strong>, <strong>desenvolvimento</strong>, <strong>teste</strong> (somente IDs selecionados).
        </p>
        <div className="mt-4 space-y-3">
          {featureKeys.map((key) => {
            const row = rawFeatures[key] as { mode?: string; testers?: string[] } | undefined;
            const mode = row?.mode ?? "desenvolvimento";
            const testers = Array.isArray(row?.testers) ? row!.testers.join(", ") : "";
            return (
              <form
                key={key}
                action={adminSetSystemFeatureMode}
                className="grid gap-2 rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-bg/35 p-3 sm:grid-cols-[1fr_auto_auto]"
              >
                <input type="hidden" name="feature" value={key} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-eid-fg">{SYSTEM_FEATURE_LABEL[key]}</p>
                  <input
                    name="testers"
                    defaultValue={testers}
                    placeholder="IDs de teste (quando modo=teste), separados por vírgula"
                    className="eid-input-dark mt-1 h-9 w-full rounded-lg px-2 text-xs text-eid-fg"
                  />
                </div>
                <select
                  name="mode"
                  defaultValue={mode}
                  className="eid-input-dark h-9 rounded-lg px-2 text-xs font-semibold text-eid-fg"
                >
                  <option value="ativo">ativo</option>
                  <option value="em_breve">em_breve</option>
                  <option value="desenvolvimento">desenvolvimento</option>
                  <option value="teste">teste</option>
                </select>
                <button
                  type="submit"
                  className="rounded-lg border border-eid-primary-500/45 bg-eid-primary-500/15 px-3 py-2 text-[11px] font-bold text-eid-fg"
                >
                  Salvar
                </button>
              </form>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/50 p-4">
        <h2 className="text-base font-bold text-eid-fg">Desafio de ranking · carência entre oponentes</h2>
        <p className="mt-1 text-sm text-eid-text-secondary">
          Período mínimo (em meses) após um confronto individual válido para ranking no mesmo esporte, antes que o mesmo par possa solicitar outro desafio de ranking. Não se aplica a desafio amistoso.
        </p>
        <form action={adminSetMatchRankCooldownMeses} className="mt-4 flex flex-wrap items-end gap-3">
          <label className="grid gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-eid-text-secondary">Meses</span>
            <input
              type="number"
              name="meses"
              min={1}
              max={120}
              defaultValue={cooldownMeses}
              className="eid-input-dark h-10 w-28 rounded-lg px-2 text-sm text-eid-fg"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg border border-eid-primary-500/45 bg-eid-primary-500/15 px-4 py-2 text-xs font-bold text-eid-fg"
          >
            Salvar
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/50 p-4">
        <h2 className="text-base font-bold text-eid-fg">Desafio de ranking · limite de pendências</h2>
        <p className="mt-1 text-sm text-eid-text-secondary">
          Quantos jogos de ranking cada jogador pode manter pendentes de lançamento/validação de resultado antes de
          abrir um novo desafio.
        </p>
        <form action={adminSetMatchRankPendingLimit} className="mt-4 flex flex-wrap items-end gap-3">
          <label className="grid gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-eid-text-secondary">Limite</span>
            <input
              type="number"
              name="limite"
              min={1}
              max={20}
              defaultValue={pendingLimit}
              className="eid-input-dark h-10 w-28 rounded-lg px-2 text-sm text-eid-fg"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg border border-eid-primary-500/45 bg-eid-primary-500/15 px-4 py-2 text-xs font-bold text-eid-fg"
          >
            Salvar
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/50 p-4">
        <h2 className="text-base font-bold text-eid-fg">Resultado · autoaprovação</h2>
        <p className="mt-1 text-sm text-eid-text-secondary">
          Prazo para autoaprovar resultado pendente sem contestação do oponente.
        </p>
        <form action={adminSetMatchResultadoAutoAprovacaoHoras} className="mt-4 flex flex-wrap items-end gap-3">
          <label className="grid gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-eid-text-secondary">Horas</span>
            <input
              type="number"
              name="horas"
              min={1}
              max={168}
              defaultValue={autoApproveHoras}
              className="eid-input-dark h-10 w-28 rounded-lg px-2 text-sm text-eid-fg"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg border border-eid-primary-500/45 bg-eid-primary-500/15 px-4 py-2 text-xs font-bold text-eid-fg"
          >
            Salvar
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-base font-bold text-eid-fg">Regras de ranking (modalidade)</h2>
        <p className="mt-1 text-sm text-eid-text-secondary">Leitura via service role — ajustes finos podem ser feitos por migração SQL.</p>
        {rr.error ? <p className="text-red-300">{rr.error.message}</p> : null}
        <div className="mt-3 overflow-x-auto rounded-xl border border-[color:var(--eid-border-subtle)]">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="border-b border-[color:var(--eid-border-subtle)] bg-eid-card text-[10px] font-bold uppercase text-eid-text-secondary">
              <tr>
                <th className="px-2 py-2">Esporte</th>
                <th className="px-2 py-2">Modalidade</th>
                <th className="px-2 py-2">Vitória</th>
                <th className="px-2 py-2">Derrota</th>
              </tr>
            </thead>
            <tbody>
              {(rr.data ?? []).map((r: Record<string, unknown>, i: number) => {
                const esp = r.esportes as { nome?: string } | null;
                return (
                  <tr key={`rr-${i}`} className="border-b border-[color:var(--eid-border-subtle)]/50">
                    <td className="px-2 py-1.5">{String(esp?.nome ?? r.esporte_id ?? "")}</td>
                    <td className="px-2 py-1.5">{String(r.modalidade ?? "")}</td>
                    <td className="px-2 py-1.5">{String(r.pontos_vitoria ?? "")}</td>
                    <td className="px-2 py-1.5">{String(r.pontos_derrota ?? "")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-base font-bold text-eid-fg">Regras de ranking no desafio (EID)</h2>
        {rrm.error ? <p className="text-red-300">{rrm.error.message}</p> : null}
        <div className="mt-3 overflow-x-auto rounded-xl border border-[color:var(--eid-border-subtle)]">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="border-b border-[color:var(--eid-border-subtle)] bg-eid-card text-[10px] font-bold uppercase text-eid-text-secondary">
              <tr>
                <th className="px-2 py-2">Esporte</th>
                <th className="px-2 py-2">K</th>
                <th className="px-2 py-2">Vitória</th>
                <th className="px-2 py-2">Derrota</th>
              </tr>
            </thead>
            <tbody>
              {(rrm.data ?? []).map((r: Record<string, unknown>, i: number) => {
                const esp = r.esportes as { nome?: string } | null;
                return (
                  <tr key={`rrm-${i}`} className="border-b border-[color:var(--eid-border-subtle)]/50">
                    <td className="px-2 py-1.5">{String(esp?.nome ?? r.esporte_id ?? "")}</td>
                    <td className="px-2 py-1.5">{String(r.k_factor ?? "")}</td>
                    <td className="px-2 py-1.5">{String(r.pontos_vitoria ?? "")}</td>
                    <td className="px-2 py-1.5">{String(r.pontos_derrota ?? "")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
