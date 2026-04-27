import Link from "next/link";
import { adminCancelarLimparPartida, adminDefinirResultadoPartida } from "@/app/admin/actions";
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
      <div className="mt-4 overflow-x-auto rounded-xl border border-[color:var(--eid-border-subtle)]">
        <table className="w-full min-w-[900px] text-left text-xs">
          <thead className="border-b border-[color:var(--eid-border-subtle)] bg-eid-card text-[10px] font-bold uppercase text-eid-text-secondary">
            <tr>
              <th className="px-2 py-2">ID</th>
              <th className="px-2 py-2">Match</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Esp.</th>
              <th className="px-2 py-2">Torneio</th>
              <th className="px-2 py-2">Quando</th>
              <th className="px-2 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((p) => (
              <tr key={p.id} className="border-b border-[color:var(--eid-border-subtle)]/50">
                {(() => {
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
                    <>
                <td className="px-2 py-1.5 font-mono text-eid-text-secondary">{p.id}</td>
                <td className="px-2 py-1.5 font-mono text-eid-text-secondary">{p.match_id ?? "—"}</td>
                <td className="px-2 py-1.5">{p.status ?? "—"}</td>
                <td className="px-2 py-1.5">{p.esporte_id ?? "—"}</td>
                <td className="px-2 py-1.5">
                  {p.torneio_id ? (
                    <Link href={`/torneios/${p.torneio_id}`} className="text-eid-primary-300 hover:underline" target="_blank" rel="noreferrer">
                      {p.torneio_id}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-2 py-1.5 text-eid-text-secondary">
                  {p.data_partida ? new Date(p.data_partida).toLocaleString("pt-BR") : p.criado_em ? new Date(p.criado_em).toLocaleString("pt-BR") : "—"}
                </td>
                <td className="px-2 py-1.5">
                  <div className="flex flex-wrap items-center gap-1.5">
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
                        disabled={!podeDefinirResultado}
                        className="rounded-md border border-emerald-600/55 bg-emerald-500/18 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.05em] text-[color:color-mix(in_srgb,var(--eid-success-700)_82%,var(--eid-fg)_18%)] hover:bg-emerald-500/30"
                      >
                        Definir resultado
                      </button>
                    </form>
                    <form action={adminCancelarLimparPartida}>
                      <input type="hidden" name="partida_id" value={p.id} />
                      <button
                        type="submit"
                        disabled={!podeLimpar}
                        className="rounded-md border border-rose-600/55 bg-rose-500/18 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.05em] text-[color:color-mix(in_srgb,var(--eid-danger-700)_82%,var(--eid-fg)_18%)] hover:bg-rose-500/30 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        Cancelar/Limpar
                      </button>
                    </form>
                  </div>
                </td>
                    </>
                  );
                })()}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
