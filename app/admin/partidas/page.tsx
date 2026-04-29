import Link from "next/link";
import { adminCancelarLimparPartida, adminDefinirResultadoPartida } from "@/app/admin/actions";
import { EidCancelAction } from "@/components/ui/eid-cancel-action";
import { createServiceRoleClient, hasServiceRoleConfig } from "@/lib/supabase/service-role";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminPartidasPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const flash = typeof sp.adm_flash === "string" ? sp.adm_flash : "";
  if (!hasServiceRoleConfig()) {
    return <p className="text-sm text-eid-text-secondary">Configure a service role.</p>;
  }
  const db = createServiceRoleClient();
  const { data, error } = await db
    .from("partidas")
    .select("id, match_id, status, status_ranking, esporte_id, jogador1_id, jogador2_id, time1_id, time2_id, torneio_id, data_partida, criado_em")
    .order("id", { ascending: false })
    .limit(200);
  if (error) return <p className="text-sm text-red-300">{error.message}</p>;
  const rows = data ?? [];
  const userIds = [...new Set(rows.flatMap((r) => [r.jogador1_id, r.jogador2_id]).filter(Boolean))] as string[];
  const esporteIds = [...new Set(rows.map((r) => Number(r.esporte_id ?? 0)).filter((n) => Number.isFinite(n) && n > 0))];
  const [{ data: profilesRows }, { data: esportesRows }] = await Promise.all([
    userIds.length > 0 ? db.from("profiles").select("id, nome, avatar_url").in("id", userIds) : Promise.resolve({ data: [] }),
    esporteIds.length > 0 ? db.from("esportes").select("id, nome").in("id", esporteIds) : Promise.resolve({ data: [] }),
  ]);
  const profileMap = new Map(
    (profilesRows ?? []).map((p) => [String((p as { id?: string }).id ?? ""), p as { nome?: string | null; avatar_url?: string | null }])
  );
  const esporteMap = new Map((esportesRows ?? []).map((e) => [Number((e as { id?: number }).id ?? 0), String((e as { nome?: string }).nome ?? "")]));

  return (
    <div>
      <h2 className="text-base font-bold text-eid-fg">Partidas</h2>
      <p className="mt-1 text-sm text-eid-text-secondary">Últimas 200.</p>
      {flash === "partida_limpar_ok" ? (
        <p className="mt-3 rounded-lg border border-emerald-500/35 bg-emerald-500/12 px-3 py-2 text-xs font-semibold text-[color:color-mix(in_srgb,var(--eid-success-600)_80%,var(--eid-fg)_20%)]">
          Partida limpa/cancelada com sucesso.
        </p>
      ) : null}
      {flash === "partida_resultado_ok" ? (
        <p className="mt-3 rounded-lg border border-emerald-500/35 bg-emerald-500/12 px-3 py-2 text-xs font-semibold text-[color:color-mix(in_srgb,var(--eid-success-600)_80%,var(--eid-fg)_20%)]">
          Resultado definido com sucesso por mediação do admin.
        </p>
      ) : null}
      {flash === "partida_limpar_invalida" || flash === "partida_limpar_nao_encontrada" || flash === "partida_limpar_erro" ? (
        <p className="mt-3 rounded-lg border border-rose-500/35 bg-rose-500/12 px-3 py-2 text-xs font-semibold text-[color:color-mix(in_srgb,var(--eid-danger-600)_82%,var(--eid-fg)_18%)]">
          Não foi possível limpar a partida. Tente novamente.
        </p>
      ) : null}
      {flash === "partida_resultado_invalido" || flash === "partida_resultado_erro" ? (
        <p className="mt-3 rounded-lg border border-rose-500/35 bg-rose-500/12 px-3 py-2 text-xs font-semibold text-[color:color-mix(in_srgb,var(--eid-danger-600)_82%,var(--eid-fg)_18%)]">
          Não foi possível definir o resultado da partida.
        </p>
      ) : null}
      <div className="mt-4 grid gap-3">
        {rows.map((p) => {
          const status = String(p.status ?? "").trim().toLowerCase();
          const statusRanking = String(p.status_ranking ?? "").trim().toLowerCase();
          const jaCancelada = status === "cancelada" || statusRanking === "cancelado_admin";
          const jaConcluida =
            status === "concluida" ||
            status === "concluído" ||
            status === "concluido" ||
            status === "validada" ||
            status === "finalizada" ||
            statusRanking === "validado";
          const podeLimpar = !jaCancelada;
          const podeDefinirResultado = !jaCancelada && !jaConcluida;
          return (
            <article key={p.id} className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-3">
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/55 px-2 py-0.5 font-mono text-eid-text-secondary">
                  Partida #{p.id}
                </span>
                <span className="rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/55 px-2 py-0.5 font-mono text-eid-text-secondary">
                  Match {p.match_id ?? "—"}
                </span>
                <span className="rounded-full border border-eid-primary-500/30 bg-eid-primary-500/10 px-2 py-0.5 font-semibold text-eid-primary-300">
                  {p.status ?? "—"}
                </span>
              </div>

              <div className="mt-2 grid gap-1 text-[11px] text-eid-text-secondary sm:grid-cols-3">
                <p>
                  <span className="font-semibold text-eid-fg">Esporte:</span> {esporteMap.get(Number(p.esporte_id ?? 0)) || p.esporte_id || "—"}
                </p>
                <p>
                  <span className="font-semibold text-eid-fg">Torneio:</span>{" "}
                  {p.torneio_id ? (
                    <Link href={`/torneios/${p.torneio_id}`} className="text-eid-primary-300 hover:underline" target="_blank" rel="noreferrer">
                      {p.torneio_id}
                    </Link>
                  ) : (
                    "—"
                  )}
                </p>
                <p>
                  <span className="font-semibold text-eid-fg">Quando:</span>{" "}
                  {p.data_partida
                    ? new Date(p.data_partida).toLocaleString("pt-BR")
                    : p.criado_em
                      ? new Date(p.criado_em).toLocaleString("pt-BR")
                      : "—"}
                </p>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                {[p.jogador1_id, p.jogador2_id].map((uid, idx) => {
                  if (!uid) return null;
                  const pf = profileMap.get(uid);
                  return (
                    <span key={`${p.id}-${uid}`} className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 px-1.5 py-0.5 text-[10px] text-eid-text-secondary">
                      <span className="inline-flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface text-[8px] font-bold text-eid-fg">
                        {pf?.avatar_url ? <img src={pf.avatar_url} alt="" className="h-full w-full object-cover" /> : String(pf?.nome ?? `J${idx + 1}`).slice(0, 1)}
                      </span>
                      <span className="max-w-[150px] truncate text-eid-fg">{pf?.nome ?? uid}</span>
                    </span>
                  );
                })}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Link
                  href={`/registrar-placar/${p.id}?from=/admin/partidas&admin=1`}
                  className="rounded-md border border-eid-primary-500/55 bg-eid-primary-500/18 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.05em] text-eid-primary-200 hover:bg-eid-primary-500/30"
                >
                  Abrir lançador completo
                </Link>
                {podeDefinirResultado ? (
                  <form action={adminDefinirResultadoPartida} className="flex flex-wrap items-center gap-1">
                    <input type="hidden" name="partida_id" value={p.id} />
                    <select
                      name="winner_side"
                      defaultValue="1"
                      className="eid-input-dark rounded-md border border-[color:var(--eid-border-subtle)] px-1.5 py-1 text-[10px]"
                    >
                      <option value="1">Venceu lado 1</option>
                      <option value="2">Venceu lado 2</option>
                    </select>
                    <input
                      type="number"
                      name="placar_1"
                      min={0}
                      defaultValue={1}
                      className="eid-input-dark w-12 rounded-md border border-[color:var(--eid-border-subtle)] px-1 py-1 text-[10px]"
                    />
                    <span className="text-[10px] text-eid-text-secondary">x</span>
                    <input
                      type="number"
                      name="placar_2"
                      min={0}
                      defaultValue={0}
                      className="eid-input-dark w-12 rounded-md border border-[color:var(--eid-border-subtle)] px-1 py-1 text-[10px]"
                    />
                    <button
                      type="submit"
                      className="rounded-md border border-emerald-600/55 bg-emerald-500/18 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.05em] text-[color:color-mix(in_srgb,var(--eid-success-700)_82%,var(--eid-fg)_18%)] hover:bg-emerald-500/30"
                    >
                      Definir resultado
                    </button>
                  </form>
                ) : null}
                {podeLimpar ? (
                  <form action={adminCancelarLimparPartida}>
                    <input type="hidden" name="partida_id" value={p.id} />
                    <EidCancelAction label="Cancelar/Limpar" compact className="rounded-md" />
                  </form>
                ) : null}
                {!podeLimpar && !podeDefinirResultado ? (
                  <span className="rounded-md border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.05em] text-eid-text-secondary">
                    Sem ação pendente
                  </span>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
