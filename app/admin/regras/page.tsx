import {
  adminApplyDesafioScorePresets,
  adminDeleteDesafioScoreVariant,
  adminUpsertDesafioScoreVariant,
  adminUpdateEsporteDesafioConfig,
  adminSetMatchRankCooldownMeses,
  adminSetMatchRankMonthlyLimitPerSport,
  adminSetMatchRankPendingLimit,
  adminSetMatchResultadoAutoAprovacaoHoras,
  adminUpdateRegrasRankingRow,
  adminUpdateRegrasRankingMatchRow,
} from "@/app/admin/actions";
import { countRankingMonthlyUsageIndividual, countRankingMonthlyUsagePorTime } from "@/lib/match/ranking-monthly-usage";
import { createServiceRoleClient, hasServiceRoleConfig } from "@/lib/supabase/service-role";

type UsageIdentity = {
  key: string;
  userId?: string;
  teamId?: number;
  esporteId: number;
  modalidade: "individual" | "dupla" | "time";
};

function normUsageStatus(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function isRankingFinalizado(row: Record<string, unknown>) {
  const status = normUsageStatus(row.status);
  const ranking = normUsageStatus(row.status_ranking);
  return ranking === "validado" || ["concluida", "concluída", "concluido", "concluído", "finalizada", "finalizado", "encerrada", "encerrado", "validada"].includes(status);
}

function isRankingCancelado(row: Record<string, unknown>) {
  const status = normUsageStatus(row.status);
  return ["cancelada", "cancelado", "recusada", "recusado", "cancelled", "canceled"].includes(status);
}

function modalidadeUso(row: Record<string, unknown>): "individual" | "dupla" | "time" {
  const raw = normUsageStatus(row.modalidade ?? row.modalidade_confronto ?? row.tipo);
  if (raw === "dupla") return "dupla";
  if (raw === "time" || raw === "equipe") return "time";
  return "individual";
}

function dataFinalUso(row: Record<string, unknown>) {
  const raw = row.data_resultado ?? row.data_validacao ?? row.data_registro ?? row.data_partida ?? null;
  if (!raw) return "";
  const date = new Date(String(raw));
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

export default async function AdminRegrasPage() {
  if (!hasServiceRoleConfig()) {
    return <p className="text-sm text-eid-text-secondary">Configure a service role.</p>;
  }
  const db = createServiceRoleClient();
  const [rr, rrm, esportesCfg, cooldownRow, pendingLimitRow, monthlyLimitRow, autoApproveRow] = await Promise.all([
    db.from("regras_ranking").select("*, esportes(nome)").order("esporte_id", { ascending: true }).limit(100),
    db.from("regras_ranking_match").select("*, esportes(nome)").order("esporte_id", { ascending: true }).limit(100),
    db
      .from("esportes")
      .select("id, nome, desafio_modo_lancamento, desafio_regras_placar_json")
      .order("ordem", { ascending: true })
      .limit(100),
    db.from("app_config").select("value_json").eq("key", "match_rank_cooldown_meses").maybeSingle(),
    db.from("app_config").select("value_json").eq("key", "match_rank_pending_result_limit").maybeSingle(),
    db.from("app_config").select("value_json").eq("key", "match_rank_monthly_limit_per_sport").maybeSingle(),
    db.from("app_config").select("value_json").eq("key", "match_resultado_autoaprovacao_horas").maybeSingle(),
  ]);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).toISOString();
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0).toISOString();
  const [{ data: partidasUsoRows }, { data: matchesUsoRows }] = await Promise.all([
    db
      .from("partidas")
      .select("id, esporte_id, modalidade, jogador1_id, jogador2_id, time1_id, time2_id, status, status_ranking, data_resultado, data_validacao, data_partida, data_registro")
      .is("torneio_id", null)
      .order("id", { ascending: false })
      .limit(4000),
    db
      .from("matches")
      .select("id, esporte_id, finalidade, modalidade_confronto, tipo, usuario_id, adversario_id, desafiante_time_id, adversario_time_id, status")
      .eq("finalidade", "ranking")
      .order("id", { ascending: false })
      .limit(4000),
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
  let monthlyLimit = 4;
  const mj = monthlyLimitRow.data?.value_json;
  if (mj && typeof mj === "object" && !Array.isArray(mj) && "limite" in mj) {
    const n = Number((mj as { limite?: unknown }).limite);
    if (Number.isFinite(n) && n >= 1) monthlyLimit = Math.min(60, Math.floor(n));
  }

  const esportesById = new Map<number, string>(
    (esportesCfg.data ?? [])
      .map((e: Record<string, unknown>) => [Number(e.id ?? 0), String(e.nome ?? "Esporte")] as const)
      .filter(([id]) => Number.isFinite(id) && id > 0)
  );
  const usageIdentities = new Map<string, UsageIdentity>();
  const addUsageIdentity = (identity: Omit<UsageIdentity, "key">) => {
    const key =
      identity.modalidade === "individual"
        ? `u:${identity.userId}:${identity.esporteId}:individual`
        : `t:${identity.teamId}:${identity.esporteId}:${identity.modalidade}`;
    usageIdentities.set(key, { ...identity, key });
  };

  for (const partida of (partidasUsoRows ?? []) as Record<string, unknown>[]) {
    const esporteId = Number(partida.esporte_id ?? 0);
    if (!Number.isFinite(esporteId) || esporteId <= 0 || isRankingCancelado(partida)) continue;
    if (isRankingFinalizado(partida)) {
      const iso = dataFinalUso(partida);
      if (!iso || iso < monthStart || iso >= nextMonthStart) continue;
    }
    const modalidade = modalidadeUso(partida);
    if (modalidade === "individual") {
      for (const rawUserId of [partida.jogador1_id, partida.jogador2_id]) {
        const userId = String(rawUserId ?? "").trim();
        if (userId) addUsageIdentity({ userId, esporteId, modalidade });
      }
    } else {
      for (const rawTeamId of [partida.time1_id, partida.time2_id]) {
        const teamId = Number(rawTeamId ?? 0);
        if (Number.isFinite(teamId) && teamId > 0) addUsageIdentity({ teamId, esporteId, modalidade });
      }
    }
  }

  for (const match of (matchesUsoRows ?? []) as Record<string, unknown>[]) {
    const esporteId = Number(match.esporte_id ?? 0);
    if (!Number.isFinite(esporteId) || esporteId <= 0 || isRankingCancelado(match) || isRankingFinalizado(match)) continue;
    const modalidade = modalidadeUso(match);
    if (modalidade === "individual") {
      for (const rawUserId of [match.usuario_id, match.adversario_id]) {
        const userId = String(rawUserId ?? "").trim();
        if (userId) addUsageIdentity({ userId, esporteId, modalidade });
      }
    } else {
      for (const rawTeamId of [match.desafiante_time_id, match.adversario_time_id]) {
        const teamId = Number(rawTeamId ?? 0);
        if (Number.isFinite(teamId) && teamId > 0) addUsageIdentity({ teamId, esporteId, modalidade });
      }
    }
  }

  const usageRows = (
    await Promise.all(
      [...usageIdentities.values()].slice(0, 100).map(async (identity) => {
        const usage =
          identity.modalidade === "individual" && identity.userId
            ? await countRankingMonthlyUsageIndividual(db, identity.userId, identity.esporteId)
            : identity.modalidade !== "individual" && identity.teamId
              ? await countRankingMonthlyUsagePorTime(db, identity.teamId, identity.esporteId, identity.modalidade)
              : { used: 0 };
        return { ...identity, count: usage.used };
      }),
    )
  )
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 80);
  const usageUserIds = [...new Set(usageRows.map((r) => r.userId).filter((id): id is string => Boolean(id)))];
  const usageTeamIds = [...new Set(usageRows.map((r) => r.teamId).filter((id): id is number => typeof id === "number" && Number.isFinite(id) && id > 0))];
  const { data: usageProfiles } = usageUserIds.length
    ? await db.from("profiles").select("id, nome").in("id", usageUserIds)
    : { data: [] };
  const { data: usageTeams } = usageTeamIds.length
    ? await db.from("times").select("id, nome, tipo").in("id", usageTeamIds)
    : { data: [] };
  const nomeByUserId = new Map((usageProfiles ?? []).map((p) => [String((p as { id?: string | null }).id ?? ""), String((p as { nome?: string | null }).nome ?? "Usuário")]));
  const nomeByTeamId = new Map((usageTeams ?? []).map((team) => [Number((team as { id?: number | null }).id ?? 0), String((team as { nome?: string | null }).nome ?? "Formação")]));
  let autoApproveHoras = 24;
  const aj = autoApproveRow.data?.value_json;
  if (aj && typeof aj === "object" && !Array.isArray(aj) && "horas" in aj) {
    const n = Number((aj as { horas?: unknown }).horas);
    if (Number.isFinite(n) && n >= 1) autoApproveHoras = Math.min(168, Math.floor(n));
  }

  return (
    <div className="space-y-10">
      <p className="text-xs text-eid-text-secondary">
        Para ligar ou ocultar módulos do app (Marketplace, Torneios, etc.), use{" "}
        <a className="font-semibold text-eid-primary-300 underline" href="/admin/funcionalidades-do-app">
          Funcionalidades do app
        </a>{" "}
        no menu do admin — esta página trata só de <strong className="text-eid-fg">pontos de ranking e desafio</strong>.
      </p>

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
        <h2 className="text-base font-bold text-eid-fg">Desafio de ranking · limite mensal por esporte</h2>
        <p className="mt-1 text-sm text-eid-text-secondary">
          Máximo de confrontos de ranking que cada usuário pode iniciar/concluir no mês em cada esporte e tipo de formação
          (individual, dupla e time contam separadamente). Ao virar o mês, o contador reinicia.
        </p>
        <form action={adminSetMatchRankMonthlyLimitPerSport} className="mt-4 flex flex-wrap items-end gap-3">
          <label className="grid gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-eid-text-secondary">Limite mensal</span>
            <input
              type="number"
              name="limite"
              min={1}
              max={60}
              defaultValue={monthlyLimit}
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
        <h2 className="text-base font-bold text-eid-fg">Resumo mensal de uso (ranking)</h2>
        <p className="mt-1 text-sm text-eid-text-secondary">
          Consumo por usuário em cada esporte e tipo de formação no mês atual. Referência do limite atual:{" "}
          <strong className="text-eid-fg">{monthlyLimit}</strong>.
        </p>
        {usageRows.length === 0 ? (
          <p className="mt-3 text-sm text-eid-text-secondary">Sem confrontos válidos neste mês até o momento.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-xl border border-[color:var(--eid-border-subtle)]">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="border-b border-[color:var(--eid-border-subtle)] bg-eid-card text-[10px] font-bold uppercase text-eid-text-secondary">
                <tr>
                  <th className="px-2 py-2">Usuário</th>
                  <th className="px-2 py-2">Esporte</th>
                  <th className="px-2 py-2">Modalidade</th>
                  <th className="px-2 py-2">Uso no mês</th>
                </tr>
              </thead>
              <tbody>
                {usageRows.map((r, i) => (
                  <tr key={`${r.userId}:${r.esporteId}:${r.modalidade}:${i}`} className="border-b border-[color:var(--eid-border-subtle)]/50">
                    <td className="px-2 py-1.5 text-eid-fg">
                      {r.modalidade === "individual"
                        ? nomeByUserId.get(r.userId ?? "") ?? r.userId
                        : `${r.modalidade === "time" ? "Time" : "Dupla"}: ${nomeByTeamId.get(r.teamId ?? 0) ?? `#${r.teamId}`}`}
                    </td>
                    <td className="px-2 py-1.5 text-eid-text-secondary">{esportesById.get(r.esporteId) ?? `#${r.esporteId}`}</td>
                    <td className="px-2 py-1.5 text-eid-text-secondary">{r.modalidade}</td>
                    <td className="px-2 py-1.5">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                          r.count >= monthlyLimit
                            ? "border-amber-400/40 bg-amber-500/15 text-amber-200"
                            : "border-eid-primary-500/35 bg-eid-primary-500/10 text-eid-primary-200"
                        }`}
                      >
                        {r.count}/{monthlyLimit}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
        <h2 className="text-base font-bold text-eid-fg">Desafio por esporte · modo de lançamento e regras de placar</h2>
        <p className="mt-1 text-sm text-eid-text-secondary">
          Configure como o placar deve ser lançado em cada esporte e valide limites no backend usando JSON.
          Você também pode definir <strong className="text-eid-fg">variantes alternativas</strong> em `variantes`.
        </p>
        <form action={adminApplyDesafioScorePresets} className="mt-3">
          <button
            type="submit"
            className="rounded-lg border border-eid-primary-500/45 bg-eid-primary-500/15 px-4 py-2 text-xs font-bold text-eid-fg"
          >
            Aplicar presets automáticos por esporte
          </button>
        </form>
        <p className="mt-2 text-[11px] text-eid-text-secondary">
          Exemplo de JSON com placares alternativos:
          <code className="ml-1">
            {
              '{"minPlacar":0,"maxPlacar":7,"permitirEmpate":false,"permitirWO":true,"variantes":[{"key":"padrao","label":"Padrão","minPlacar":0,"maxPlacar":7,"permitirEmpate":false,"permitirWO":true},{"key":"set_unico_8_games","label":"Set único de 8 games","minPlacar":0,"maxPlacar":8,"permitirEmpate":false,"permitirWO":true}]}'
            }
          </code>
        </p>
        {esportesCfg.error ? <p className="text-red-300">{esportesCfg.error.message}</p> : null}
        <div className="mt-3 overflow-x-auto rounded-xl border border-[color:var(--eid-border-subtle)]">
          <table className="w-full min-w-[980px] text-left text-xs">
            <thead className="border-b border-[color:var(--eid-border-subtle)] bg-eid-card text-[10px] font-bold uppercase text-eid-text-secondary">
              <tr>
                <th className="px-2 py-2">Esporte</th>
                <th className="px-2 py-2">Modo</th>
                <th className="px-2 py-2">Regras (JSON)</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {(esportesCfg.data ?? []).map((e: Record<string, unknown>) => (
                <tr key={`esp-desafio-${String(e.id ?? "")}`} className="border-b border-[color:var(--eid-border-subtle)]/50 align-top">
                  <td className="px-2 py-1.5 font-medium text-eid-fg">{String(e.nome ?? `#${String(e.id ?? "")}`)}</td>
                  <td className="p-1">
                    <form action={adminUpdateEsporteDesafioConfig} className="flex flex-wrap items-start gap-2">
                      <input type="hidden" name="id" value={String(e.id ?? "")} />
                      <select
                        name="desafio_modo_lancamento"
                        defaultValue={String(e.desafio_modo_lancamento ?? "simples")}
                        className="eid-input-dark h-8 min-w-[180px] rounded px-2 text-[11px] text-eid-fg"
                      >
                        <option value="simples">simples</option>
                        <option value="sets">sets</option>
                        <option value="games">games</option>
                        <option value="pontos_corridos">pontos_corridos</option>
                      </select>
                      <textarea
                        name="desafio_regras_placar_json"
                        rows={3}
                        defaultValue={JSON.stringify(e.desafio_regras_placar_json ?? {}, null, 0)}
                        className="eid-input-dark min-h-[70px] min-w-[460px] rounded px-2 py-1.5 text-[11px] text-eid-fg"
                        placeholder='{"minPlacar":0,"maxPlacar":21,"permitirEmpate":false,"permitirWO":true}'
                      />
                      <button
                        type="submit"
                        className="rounded border border-eid-primary-500/40 px-2 py-1 text-[10px] font-bold text-eid-primary-300"
                      >
                        Salvar
                      </button>
                    </form>
                    <div className="mt-2 rounded-lg border border-[color:var(--eid-border-subtle)]/60 p-2">
                      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Variantes guiadas</p>
                      {Array.isArray((e as { desafio_regras_placar_json?: { variantes?: unknown[] } }).desafio_regras_placar_json?.variantes) &&
                      ((e as { desafio_regras_placar_json?: { variantes?: unknown[] } }).desafio_regras_placar_json?.variantes?.length ?? 0) > 0 ? (
                        <div className="mt-2 space-y-2">
                          {((e as { desafio_regras_placar_json?: { variantes?: unknown[] } }).desafio_regras_placar_json?.variantes ?? []).map((v, i) => (
                            <div key={`var-${String(e.id ?? "")}-${i}`} className="rounded border border-[color:var(--eid-border-subtle)]/60 p-2">
                              <form action={adminUpsertDesafioScoreVariant} className="grid gap-2 sm:grid-cols-6">
                                <input type="hidden" name="esporte_id" value={String(e.id ?? "")} />
                                <input type="hidden" name="original_key" value={String((v as { key?: unknown }).key ?? "")} />
                                <input
                                  name="key"
                                  defaultValue={String((v as { key?: unknown }).key ?? "")}
                                  className="eid-input-dark h-8 rounded px-2 text-[11px] text-eid-fg sm:col-span-1"
                                  placeholder="chave"
                                />
                                <input
                                  name="label"
                                  defaultValue={String((v as { label?: unknown }).label ?? "")}
                                  className="eid-input-dark h-8 rounded px-2 text-[11px] text-eid-fg sm:col-span-2"
                                  placeholder="nome da variante"
                                />
                                <input
                                  type="number"
                                  name="minPlacar"
                                  defaultValue={String((v as { minPlacar?: unknown }).minPlacar ?? 0)}
                                  className="eid-input-dark h-8 rounded px-2 text-[11px] text-eid-fg"
                                  placeholder="min"
                                />
                                <input
                                  type="number"
                                  name="maxPlacar"
                                  defaultValue={String((v as { maxPlacar?: unknown }).maxPlacar ?? 30)}
                                  className="eid-input-dark h-8 rounded px-2 text-[11px] text-eid-fg"
                                  placeholder="max"
                                />
                                <select
                                  name="permitirEmpate"
                                  defaultValue={String(Boolean((v as { permitirEmpate?: unknown }).permitirEmpate))}
                                  className="eid-input-dark h-8 rounded px-2 text-[11px] text-eid-fg"
                                >
                                  <option value="false">Sem empate</option>
                                  <option value="true">Permite empate</option>
                                </select>
                                <select
                                  name="permitirWO"
                                  defaultValue={String((v as { permitirWO?: unknown }).permitirWO !== false)}
                                  className="eid-input-dark h-8 rounded px-2 text-[11px] text-eid-fg"
                                >
                                  <option value="true">Permite W.O.</option>
                                  <option value="false">Sem W.O.</option>
                                </select>
                                <div className="flex gap-2 sm:col-span-6">
                                  <button type="submit" className="rounded border border-eid-primary-500/40 px-2 py-1 text-[10px] font-bold text-eid-primary-300">
                                    Salvar variante
                                  </button>
                                </div>
                              </form>
                              <form action={adminDeleteDesafioScoreVariant} className="mt-2">
                                <input type="hidden" name="esporte_id" value={String(e.id ?? "")} />
                                <input type="hidden" name="key" value={String((v as { key?: unknown }).key ?? "")} />
                                <button type="submit" className="rounded border border-red-400/40 px-2 py-1 text-[10px] font-bold text-red-200">
                                  Remover variante
                                </button>
                              </form>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      <form action={adminUpsertDesafioScoreVariant} className="mt-2 grid gap-2 sm:grid-cols-6">
                        <input type="hidden" name="esporte_id" value={String(e.id ?? "")} />
                        <input name="key" className="eid-input-dark h-8 rounded px-2 text-[11px] text-eid-fg sm:col-span-1" placeholder="nova_chave" />
                        <input name="label" className="eid-input-dark h-8 rounded px-2 text-[11px] text-eid-fg sm:col-span-2" placeholder="Nova variante" />
                        <input type="number" name="minPlacar" defaultValue={0} className="eid-input-dark h-8 rounded px-2 text-[11px] text-eid-fg" />
                        <input type="number" name="maxPlacar" defaultValue={30} className="eid-input-dark h-8 rounded px-2 text-[11px] text-eid-fg" />
                        <select name="permitirEmpate" defaultValue="false" className="eid-input-dark h-8 rounded px-2 text-[11px] text-eid-fg">
                          <option value="false">Sem empate</option>
                          <option value="true">Permite empate</option>
                        </select>
                        <select name="permitirWO" defaultValue="true" className="eid-input-dark h-8 rounded px-2 text-[11px] text-eid-fg">
                          <option value="true">Permite W.O.</option>
                          <option value="false">Sem W.O.</option>
                        </select>
                        <div className="sm:col-span-6">
                          <button type="submit" className="rounded border border-emerald-400/40 px-2 py-1 text-[10px] font-bold text-emerald-200">
                            Adicionar variante
                          </button>
                        </div>
                      </form>
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-[11px] text-eid-text-secondary">Aplicado no fluxo de `registrar placar`.</td>
                  <td />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-base font-bold text-eid-fg">Regras de ranking (modalidade)</h2>
        <p className="mt-1 text-sm text-eid-text-secondary">
          Pontos de torneio/geral por esporte e modalidade. Edite e salve cada linha.
        </p>
        {rr.error ? <p className="text-red-300">{rr.error.message}</p> : null}
        <div className="mt-3 overflow-x-auto rounded-xl border border-[color:var(--eid-border-subtle)]">
          <table className="w-full min-w-[800px] text-left text-xs">
            <thead className="border-b border-[color:var(--eid-border-subtle)] bg-eid-card text-[10px] font-bold uppercase text-eid-text-secondary">
              <tr>
                <th className="px-2 py-2">Esporte</th>
                <th className="px-2 py-2">Modalidade</th>
                <th className="px-2 py-2">Vitória / derrota / empate</th>
              </tr>
            </thead>
            <tbody>
              {(rr.data ?? []).map((r: Record<string, unknown>, i: number) => {
                const esp = r.esportes as { nome?: string } | null;
                const eid = Number(r.esporte_id);
                const modalidade = String(r.modalidade ?? "");
                return (
                  <tr key={`rr-${i}`} className="border-b border-[color:var(--eid-border-subtle)]/50 align-top">
                    <td className="px-2 py-1.5 font-medium text-eid-fg">{String(esp?.nome ?? r.esporte_id ?? "")}</td>
                    <td className="px-2 py-1.5">{modalidade}</td>
                    <td className="p-1">
                      <form action={adminUpdateRegrasRankingRow} className="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="esporte_id" value={eid} />
                        <input type="hidden" name="modalidade" value={modalidade} />
                        <label className="flex items-center gap-1 text-[10px] text-eid-text-secondary">
                          V
                          <input
                            name="pontos_vitoria"
                            type="number"
                            defaultValue={String(r.pontos_vitoria ?? 0)}
                            className="eid-input-dark h-8 w-16 rounded px-1 text-eid-fg"
                          />
                        </label>
                        <label className="flex items-center gap-1 text-[10px] text-eid-text-secondary">
                          D
                          <input
                            name="pontos_derrota"
                            type="number"
                            defaultValue={String(r.pontos_derrota ?? 0)}
                            className="eid-input-dark h-8 w-16 rounded px-1 text-eid-fg"
                          />
                        </label>
                        <label className="flex items-center gap-1 text-[10px] text-eid-text-secondary">
                          E
                          <input
                            name="pontos_empate"
                            type="number"
                            defaultValue={String(r.pontos_empate ?? 0)}
                            className="eid-input-dark h-8 w-16 rounded px-1 text-eid-fg"
                          />
                        </label>
                        <button
                          type="submit"
                          className="rounded border border-eid-primary-500/40 px-2 py-1 text-[10px] font-bold text-eid-primary-300"
                        >
                          Salvar
                        </button>
                      </form>
                    </td>
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
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="border-b border-[color:var(--eid-border-subtle)] bg-eid-card text-[10px] font-bold uppercase text-eid-text-secondary">
              <tr>
                <th className="px-2 py-2">Esporte</th>
                <th className="px-1 py-2">Vitória</th>
                <th className="px-1 py-2">Derrota</th>
                <th className="px-1 py-2">/set</th>
                <th className="px-1 py-2">K</th>
                <th className="px-1 py-2">Gol</th>
                <th className="px-1 py-2">Game</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {(rrm.data ?? []).map((r: Record<string, unknown>, i: number) => {
                const esp = r.esportes as { nome?: string } | null;
                const eid = Number(r.esporte_id);
                return (
                  <tr key={`rrm-${i}`} className="border-b border-[color:var(--eid-border-subtle)]/50 align-top">
                    <td className="px-2 py-1.5 font-medium text-eid-fg">{String(esp?.nome ?? r.esporte_id ?? "")}</td>
                    <td colSpan={7} className="p-1">
                      <form action={adminUpdateRegrasRankingMatchRow} className="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="esporte_id" value={eid} />
                        <input
                          name="pontos_vitoria"
                          type="number"
                          defaultValue={String(r.pontos_vitoria ?? 0)}
                          className="eid-input-dark h-8 w-14 rounded px-1 text-eid-fg"
                        />
                        <input
                          name="pontos_derrota"
                          type="number"
                          defaultValue={String(r.pontos_derrota ?? 0)}
                          className="eid-input-dark h-8 w-14 rounded px-1 text-eid-fg"
                        />
                        <input
                          name="pontos_por_set"
                          type="number"
                          defaultValue={String(r.pontos_por_set ?? 0)}
                          className="eid-input-dark h-8 w-14 rounded px-1 text-eid-fg"
                        />
                        <input
                          name="k_factor"
                          type="number"
                          defaultValue={String(r.k_factor ?? 32)}
                          className="eid-input-dark h-8 w-14 rounded px-1 text-eid-fg"
                        />
                        <input
                          name="bonus_por_gol"
                          type="number"
                          defaultValue={String(r.bonus_por_gol ?? 0)}
                          className="eid-input-dark h-8 w-14 rounded px-1 text-eid-fg"
                        />
                        <input
                          name="bonus_por_game"
                          type="number"
                          defaultValue={String(r.bonus_por_game ?? 0)}
                          className="eid-input-dark h-8 w-14 rounded px-1 text-eid-fg"
                        />
                        <button
                          type="submit"
                          className="ml-auto rounded border border-eid-primary-500/40 px-2 py-1 text-[10px] font-bold text-eid-primary-300"
                        >
                          Salvar
                        </button>
                      </form>
                    </td>
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
