import { adminRecalcularEidHistorico, adminUpdateEidConfig } from "@/app/admin/actions";
import { createServiceRoleClient, hasServiceRoleConfig } from "@/lib/supabase/service-role";

function firstOf<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function fmtDelta(value: number | null | undefined) {
  const num = Number(value ?? 0);
  return `${num >= 0 ? "+" : ""}${num.toFixed(2)}`;
}

export default async function AdminEidPage() {
  if (!hasServiceRoleConfig()) {
    return <p className="text-sm text-eid-text-secondary">Configure a service role para listar e recalcular o EID.</p>;
  }

  const db = createServiceRoleClient();
  const [configRes, atletasRes, timesRes, logsRes] = await Promise.all([
    db.from("eid_config").select("*").eq("id", 1).maybeSingle(),
    db
      .from("usuario_eid")
      .select("usuario_id, esporte_id, nota_eid, partidas_jogadas, vitorias, derrotas, profiles(nome), esportes(nome)")
      .order("nota_eid", { ascending: false })
      .limit(200),
    db
      .from("times")
      .select("id, nome, tipo, eid_time, pontos_ranking, esportes(nome)")
      .order("eid_time", { ascending: false })
      .limit(200),
    db
      .from("eid_logs")
      .select("id, entity_kind, entity_id, entity_profile_id, entity_time_id, esporte_id, old_score, new_score, change_amount, reason, created_at")
      .order("created_at", { ascending: false })
      .limit(80),
  ]);

  const config = configRes.data;
  const profileIds = [...new Set((logsRes.data ?? []).map((log) => log.entity_profile_id).filter((value): value is string => !!value))];
  const timeIds = [
    ...new Set((logsRes.data ?? []).map((log) => log.entity_time_id).filter((value): value is number => Number.isFinite(Number(value)))),
  ];
  const esporteIds = [
    ...new Set((logsRes.data ?? []).map((log) => log.esporte_id).filter((value): value is number => Number.isFinite(Number(value)))),
  ];

  const [profilesRes, namesTimesRes, esportesLogsRes] = await Promise.all([
    profileIds.length > 0 ? db.from("profiles").select("id, nome").in("id", profileIds) : Promise.resolve({ data: [], error: null }),
    timeIds.length > 0 ? db.from("times").select("id, nome").in("id", timeIds) : Promise.resolve({ data: [], error: null }),
    esporteIds.length > 0 ? db.from("esportes").select("id, nome").in("id", esporteIds) : Promise.resolve({ data: [], error: null }),
  ]);

  const profileNameMap = new Map((profilesRes.data ?? []).map((row) => [row.id, row.nome ?? "Atleta"]));
  const timeNameMap = new Map((namesTimesRes.data ?? []).map((row) => [Number(row.id), row.nome ?? `Formação #${row.id}`]));
  const esporteNameMap = new Map((esportesLogsRes.data ?? []).map((row) => [Number(row.id), row.nome ?? "Esporte"]));

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-eid-fg">Motor EID</h2>
            <p className="mt-1 text-sm text-eid-text-secondary">
              Configuração global para jogos futuros, com recálculo manual disponível apenas para contingência.
            </p>
          </div>
          <form action={adminRecalcularEidHistorico}>
            <button
              type="submit"
              className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs font-bold uppercase tracking-wide text-amber-200 transition hover:border-amber-400/55 hover:bg-amber-500/15"
            >
              Recalcular histórico
            </button>
          </form>
        </div>

        {configRes.error ? <p className="mt-3 text-sm text-red-300">{configRes.error.message}</p> : null}

        <form action={adminUpdateEidConfig} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-eid-text-secondary">Vitória base</span>
            <input
              name="win_base"
              type="number"
              step="0.01"
              min="0"
              defaultValue={Number(config?.win_base ?? 0.25)}
              className="eid-input-dark w-full rounded-xl px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-eid-text-secondary">Derrota base</span>
            <input
              name="loss_base"
              type="number"
              step="0.01"
              min="0"
              defaultValue={Number(config?.loss_base ?? 0.15)}
              className="eid-input-dark w-full rounded-xl px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-eid-text-secondary">Bônus W.O.</span>
            <input
              name="wo_bonus"
              type="number"
              step="0.01"
              min="0"
              defaultValue={Number(config?.wo_bonus ?? 0.1)}
              className="eid-input-dark w-full rounded-xl px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-eid-text-secondary">Bônus score gap</span>
            <input
              name="score_gap_bonus"
              type="number"
              step="0.01"
              min="0"
              defaultValue={Number(config?.score_gap_bonus ?? 0.05)}
              className="eid-input-dark w-full rounded-xl px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-eid-text-secondary">Transferência dupla/time</span>
            <input
              name="double_transfer_pct"
              type="number"
              step="0.01"
              min="0"
              max="1"
              defaultValue={Number(config?.double_transfer_pct ?? 0.15)}
              className="eid-input-dark w-full rounded-xl px-3 py-2 text-sm"
            />
          </label>
          <div className="sm:col-span-2 lg:col-span-5">
            <button type="submit" className="eid-btn-primary rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wide">
              Salvar configuração
            </button>
          </div>
        </form>
      </section>

      <section>
        <h2 className="text-base font-bold text-eid-fg">Atletas por EID</h2>
        {atletasRes.error ? <p className="mt-2 text-sm text-red-300">{atletasRes.error.message}</p> : null}
        <div className="mt-3 overflow-x-auto rounded-xl border border-[color:var(--eid-border-subtle)]">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="border-b border-[color:var(--eid-border-subtle)] bg-eid-card text-[10px] font-bold uppercase text-eid-text-secondary">
              <tr>
                <th className="px-2 py-2">Atleta</th>
                <th className="px-2 py-2">Esporte</th>
                <th className="px-2 py-2">EID</th>
                <th className="px-2 py-2">Partidas</th>
                <th className="px-2 py-2">V/D</th>
              </tr>
            </thead>
            <tbody>
              {(atletasRes.data ?? []).map((row, index) => (
                <tr key={`${row.usuario_id}-${row.esporte_id}-${index}`} className="border-b border-[color:var(--eid-border-subtle)]/50">
                  <td className="px-2 py-1.5">{firstOf(row.profiles)?.nome ?? "Atleta"}</td>
                  <td className="px-2 py-1.5">{firstOf(row.esportes)?.nome ?? "Esporte"}</td>
                  <td className="px-2 py-1.5 font-black text-eid-action-400">{Number(row.nota_eid ?? 0).toFixed(2)}</td>
                  <td className="px-2 py-1.5">{Number(row.partidas_jogadas ?? 0)}</td>
                  <td className="px-2 py-1.5">
                    {Number(row.vitorias ?? 0)} / {Number(row.derrotas ?? 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-base font-bold text-eid-fg">Formações por EID</h2>
        {timesRes.error ? <p className="mt-2 text-sm text-red-300">{timesRes.error.message}</p> : null}
        <div className="mt-3 overflow-x-auto rounded-xl border border-[color:var(--eid-border-subtle)]">
          <table className="w-full min-w-[700px] text-left text-xs">
            <thead className="border-b border-[color:var(--eid-border-subtle)] bg-eid-card text-[10px] font-bold uppercase text-eid-text-secondary">
              <tr>
                <th className="px-2 py-2">Formação</th>
                <th className="px-2 py-2">Tipo</th>
                <th className="px-2 py-2">Esporte</th>
                <th className="px-2 py-2">EID</th>
                <th className="px-2 py-2">Ranking</th>
              </tr>
            </thead>
            <tbody>
              {(timesRes.data ?? []).map((row) => (
                <tr key={row.id} className="border-b border-[color:var(--eid-border-subtle)]/50">
                  <td className="px-2 py-1.5">{row.nome ?? `Formação #${row.id}`}</td>
                  <td className="px-2 py-1.5 uppercase">{row.tipo ?? "time"}</td>
                  <td className="px-2 py-1.5">{firstOf(row.esportes)?.nome ?? "Esporte"}</td>
                  <td className="px-2 py-1.5 font-black text-eid-action-400">{Number(row.eid_time ?? 0).toFixed(2)}</td>
                  <td className="px-2 py-1.5">{Number(row.pontos_ranking ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-base font-bold text-eid-fg">Logs recentes</h2>
        {logsRes.error ? <p className="mt-2 text-sm text-red-300">{logsRes.error.message}</p> : null}
        <div className="mt-3 overflow-x-auto rounded-xl border border-[color:var(--eid-border-subtle)]">
          <table className="w-full min-w-[840px] text-left text-xs">
            <thead className="border-b border-[color:var(--eid-border-subtle)] bg-eid-card text-[10px] font-bold uppercase text-eid-text-secondary">
              <tr>
                <th className="px-2 py-2">Quando</th>
                <th className="px-2 py-2">Entidade</th>
                <th className="px-2 py-2">Esporte</th>
                <th className="px-2 py-2">Antes</th>
                <th className="px-2 py-2">Depois</th>
                <th className="px-2 py-2">Delta</th>
                <th className="px-2 py-2">Motivo</th>
              </tr>
            </thead>
            <tbody>
              {(logsRes.data ?? []).map((log) => (
                <tr key={log.id} className="border-b border-[color:var(--eid-border-subtle)]/50">
                  <td className="px-2 py-1.5 text-eid-text-secondary">
                    {log.created_at ? new Date(log.created_at).toLocaleString("pt-BR") : "—"}
                  </td>
                  <td className="px-2 py-1.5">
                    {log.entity_kind === "usuario"
                      ? profileNameMap.get(log.entity_profile_id ?? "") ?? log.entity_id
                      : timeNameMap.get(Number(log.entity_time_id ?? 0)) ?? log.entity_id}
                  </td>
                  <td className="px-2 py-1.5">{esporteNameMap.get(Number(log.esporte_id ?? 0)) ?? "Esporte"}</td>
                  <td className="px-2 py-1.5">{Number(log.old_score ?? 0).toFixed(2)}</td>
                  <td className="px-2 py-1.5">{Number(log.new_score ?? 0).toFixed(2)}</td>
                  <td className={`px-2 py-1.5 font-bold ${Number(log.change_amount ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {fmtDelta(Number(log.change_amount ?? 0))}
                  </td>
                  <td className="px-2 py-1.5">{log.reason ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
