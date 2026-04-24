import Link from "next/link";
import { createServiceRoleClient, hasServiceRoleConfig } from "@/lib/supabase/service-role";

export default async function AdminOperacoesSociaisPage() {
  if (!hasServiceRoleConfig()) {
    return <p className="text-sm text-eid-text-secondary">Configure a service role para visualizar estes dados.</p>;
  }
  const db = createServiceRoleClient();

  const [
    { count: nNotif, error: e1 },
    { count: nSug, error: e2 },
    { count: nConv, error: e3 },
    { count: nPush, error: e4 },
    { data: notifRows, error: e5 },
    { data: sugRows, error: e6 },
    { data: convRows, error: e7 },
    { data: pushRows, error: e8 },
  ] = await Promise.all([
    db.from("notificacoes").select("id", { count: "exact", head: true }),
    db.from("match_sugestoes").select("id", { count: "exact", head: true }).eq("status", "pendente"),
    db.from("time_convites").select("id", { count: "exact", head: true }).eq("status", "pendente"),
    db.from("push_subscriptions").select("id", { count: "exact", head: true }).eq("ativo", true),
    db
      .from("notificacoes")
      .select("id, usuario_id, tipo, mensagem, lida, criada_em, data_criacao")
      .order("id", { ascending: false })
      .limit(80),
    db
      .from("match_sugestoes")
      .select("id, sugeridor_id, alvo_dono_id, sugeridor_time_id, alvo_time_id, esporte_id, status, criado_em")
      .eq("status", "pendente")
      .order("id", { ascending: false })
      .limit(50),
    db
      .from("time_convites")
      .select("id, time_id, convidado_usuario_id, convidado_por_usuario_id, status, criado_em")
      .eq("status", "pendente")
      .order("id", { ascending: false })
      .limit(50),
    db
      .from("push_subscriptions")
      .select("id, usuario_id, endpoint, ativo, criado_em, user_agent")
      .eq("ativo", true)
      .order("id", { ascending: false })
      .limit(40),
  ]);

  const err = e1 || e2 || e3 || e4 || e5 || e6 || e7 || e8;
  if (err) return <p className="text-sm text-red-300">{String(err.message)}</p>;

  return (
    <div>
      <h2 className="text-base font-bold text-eid-fg">Operações sociais e comunicações</h2>
      <p className="mt-1 text-sm text-eid-text-secondary">
        Visão operacional de notificações in-app, sugestões de desafio, convites de equipe e inscrições push —
        fluxos ligados ao painel, comunidade e agenda. Pedidos de desafio na tabela{" "}
        <Link href="/admin/matches" className="font-semibold text-eid-primary-300 underline">
          matches
        </Link>
        ; partidas em{" "}
        <Link href="/admin/partidas" className="font-semibold text-eid-primary-300 underline">
          partidas
        </Link>
        .
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/80 px-3 py-3 text-center">
          <p className="text-2xl font-black tabular-nums text-eid-primary-300">{nNotif ?? 0}</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-eid-text-secondary">Notificações (total)</p>
        </div>
        <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/80 px-3 py-3 text-center">
          <p className="text-2xl font-black tabular-nums text-amber-200">{nSug ?? 0}</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-eid-text-secondary">Sugestões pendentes</p>
        </div>
        <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/80 px-3 py-3 text-center">
          <p className="text-2xl font-black tabular-nums text-eid-action-300">{nConv ?? 0}</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-eid-text-secondary">Convites pendentes</p>
        </div>
        <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/80 px-3 py-3 text-center">
          <p className="text-2xl font-black tabular-nums text-emerald-200">{nPush ?? 0}</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-eid-text-secondary">Push ativos</p>
        </div>
      </div>

      <section className="mt-10">
        <h3 className="text-sm font-bold text-eid-fg">Últimas notificações in-app</h3>
        <p className="mt-0.5 text-xs text-eid-text-secondary">Até 80 registros recentes.</p>
        <div className="mt-3 overflow-x-auto rounded-xl border border-[color:var(--eid-border-subtle)]">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="border-b border-[color:var(--eid-border-subtle)] bg-eid-card text-[10px] font-bold uppercase text-eid-text-secondary">
              <tr>
                <th className="px-2 py-2">ID</th>
                <th className="px-2 py-2">Usuário</th>
                <th className="px-2 py-2">Tipo</th>
                <th className="px-2 py-2">Lida</th>
                <th className="px-2 py-2">Criada</th>
                <th className="px-2 py-2">Mensagem</th>
              </tr>
            </thead>
            <tbody>
              {(notifRows ?? []).map((r) => (
                <tr key={r.id} className="border-b border-[color:var(--eid-border-subtle)]/50">
                  <td className="px-2 py-1.5 font-mono">{r.id}</td>
                  <td className="max-w-[100px] truncate px-2 py-1.5 font-mono text-[10px]">
                    <Link href={`/admin/usuarios/${r.usuario_id}`} className="text-eid-primary-300 hover:underline">
                      {r.usuario_id}
                    </Link>
                  </td>
                  <td className="px-2 py-1.5">{r.tipo ?? "—"}</td>
                  <td className="px-2 py-1.5">{r.lida ? "sim" : "não"}</td>
                  <td className="px-2 py-1.5 text-eid-text-secondary">
                    {r.criada_em
                      ? new Date(r.criada_em).toLocaleString("pt-BR")
                      : r.data_criacao
                        ? new Date(r.data_criacao).toLocaleString("pt-BR")
                        : "—"}
                  </td>
                  <td className="max-w-md truncate px-2 py-1.5">{r.mensagem ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h3 className="text-sm font-bold text-eid-fg">Sugestões de desafio (pendentes)</h3>
        <div className="mt-3 overflow-x-auto rounded-xl border border-[color:var(--eid-border-subtle)]">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="border-b border-[color:var(--eid-border-subtle)] bg-eid-card text-[10px] font-bold uppercase text-eid-text-secondary">
              <tr>
                <th className="px-2 py-2">ID</th>
                <th className="px-2 py-2">Sugeridor</th>
                <th className="px-2 py-2">Dono alvo</th>
                <th className="px-2 py-2">Times</th>
                <th className="px-2 py-2">Esporte</th>
                <th className="px-2 py-2">Criada</th>
              </tr>
            </thead>
            <tbody>
              {(sugRows ?? []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-eid-text-secondary">
                    Nenhuma sugestão pendente.
                  </td>
                </tr>
              ) : (
                (sugRows ?? []).map((r) => (
                  <tr key={r.id} className="border-b border-[color:var(--eid-border-subtle)]/50">
                    <td className="px-2 py-1.5 font-mono">{r.id}</td>
                    <td className="max-w-[100px] truncate px-2 py-1.5 font-mono text-[10px]">{r.sugeridor_id}</td>
                    <td className="max-w-[100px] truncate px-2 py-1.5 font-mono text-[10px]">{r.alvo_dono_id}</td>
                    <td className="px-2 py-1.5 text-[10px]">
                      {r.sugeridor_time_id} → {r.alvo_time_id}
                    </td>
                    <td className="px-2 py-1.5">{r.esporte_id ?? "—"}</td>
                    <td className="px-2 py-1.5 text-eid-text-secondary">
                      {r.criado_em ? new Date(r.criado_em).toLocaleString("pt-BR") : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h3 className="text-sm font-bold text-eid-fg">Convites de equipe (pendentes)</h3>
        <div className="mt-3 overflow-x-auto rounded-xl border border-[color:var(--eid-border-subtle)]">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="border-b border-[color:var(--eid-border-subtle)] bg-eid-card text-[10px] font-bold uppercase text-eid-text-secondary">
              <tr>
                <th className="px-2 py-2">ID</th>
                <th className="px-2 py-2">Time</th>
                <th className="px-2 py-2">Convidado</th>
                <th className="px-2 py-2">Por</th>
                <th className="px-2 py-2">Criada</th>
              </tr>
            </thead>
            <tbody>
              {(convRows ?? []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-eid-text-secondary">
                    Nenhum convite pendente.
                  </td>
                </tr>
              ) : (
                (convRows ?? []).map((r) => (
                  <tr key={r.id} className="border-b border-[color:var(--eid-border-subtle)]/50">
                    <td className="px-2 py-1.5 font-mono">{r.id}</td>
                    <td className="px-2 py-1.5">{r.time_id ?? "—"}</td>
                    <td className="max-w-[100px] truncate px-2 py-1.5 font-mono text-[10px]">{r.convidado_usuario_id}</td>
                    <td className="max-w-[100px] truncate px-2 py-1.5 font-mono text-[10px]">{r.convidado_por_usuario_id}</td>
                    <td className="px-2 py-1.5 text-eid-text-secondary">
                      {r.criado_em ? new Date(r.criado_em).toLocaleString("pt-BR") : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h3 className="text-sm font-bold text-eid-fg">Inscrições push ativas (amostra)</h3>
        <p className="mt-0.5 text-xs text-eid-text-secondary">Endpoint truncado — dados sensíveis de chaves não são exibidos.</p>
        <div className="mt-3 overflow-x-auto rounded-xl border border-[color:var(--eid-border-subtle)]">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="border-b border-[color:var(--eid-border-subtle)] bg-eid-card text-[10px] font-bold uppercase text-eid-text-secondary">
              <tr>
                <th className="px-2 py-2">ID</th>
                <th className="px-2 py-2">Usuário</th>
                <th className="px-2 py-2">Endpoint (início)</th>
                <th className="px-2 py-2">Criada</th>
              </tr>
            </thead>
            <tbody>
              {(pushRows ?? []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-eid-text-secondary">
                    Nenhuma inscrição ativa na amostra.
                  </td>
                </tr>
              ) : (
                (pushRows ?? []).map((r) => (
                  <tr key={r.id} className="border-b border-[color:var(--eid-border-subtle)]/50">
                    <td className="px-2 py-1.5 font-mono">{r.id}</td>
                    <td className="max-w-[100px] truncate px-2 py-1.5 font-mono text-[10px]">{r.usuario_id}</td>
                    <td className="max-w-[280px] truncate px-2 py-1.5 font-mono text-[10px] text-eid-text-secondary">
                      {(r.endpoint ?? "").slice(0, 72)}…
                    </td>
                    <td className="px-2 py-1.5 text-eid-text-secondary">
                      {r.criado_em ? new Date(r.criado_em).toLocaleString("pt-BR") : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
