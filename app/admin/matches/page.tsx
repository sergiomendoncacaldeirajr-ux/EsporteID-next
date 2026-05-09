import { createServiceRoleClient, hasServiceRoleConfig } from "@/lib/supabase/service-role";

const TZ = "America/Sao_Paulo";

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { timeZone: TZ, dateStyle: "short", timeStyle: "short" });
}

const STATUS_BADGE: Record<string, string> = {
  pendente: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  aceito: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  recusado: "border-rose-500/30 bg-rose-500/10 text-rose-300",
  cancelado: "border-[color:var(--eid-border-subtle)] bg-eid-surface/50 text-eid-text-secondary",
  cancelamentopendente: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  reagendamentopendente: "border-violet-500/30 bg-violet-500/10 text-violet-300",
};

function statusBadge(s: string | null | undefined): string {
  return STATUS_BADGE[String(s ?? "").toLowerCase()] ?? "border-[color:var(--eid-border-subtle)] bg-eid-surface/60 text-eid-text-secondary";
}

type Profile = { nome?: string | null; avatar_url?: string | null };

function PlayerChip({ nome, avatarUrl }: { nome: string; avatarUrl: string | null }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 px-1.5 py-0.5 text-[10px]">
      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface text-[8px] font-bold text-eid-fg">
        {avatarUrl
          ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          : nome.slice(0, 1).toUpperCase()}
      </span>
      <span className="max-w-[130px] truncate font-semibold text-eid-fg">{nome}</span>
    </span>
  );
}

export default async function AdminMatchesPage() {
  if (!hasServiceRoleConfig()) {
    return <p className="text-sm text-eid-text-secondary">Configure a service role.</p>;
  }
  const db = createServiceRoleClient();
  const { data, error } = await db
    .from("matches")
    .select("id, status, esporte_id, modalidade_confronto, usuario_id, adversario_id, data_solicitacao, data_registro")
    .order("id", { ascending: false })
    .limit(200);
  if (error) return <p className="text-sm text-red-300">{error.message}</p>;

  const rows = data ?? [];
  const userIds = [...new Set(rows.flatMap((m) => [m.usuario_id, m.adversario_id]).filter(Boolean))] as string[];
  const esporteIds = [...new Set(rows.map((m) => Number(m.esporte_id ?? 0)).filter((n) => Number.isFinite(n) && n > 0))];

  const [{ data: profilesData }, { data: esportesData }] = await Promise.all([
    userIds.length > 0
      ? db.from("profiles").select("id, nome, avatar_url").in("id", userIds)
      : Promise.resolve({ data: [] }),
    esporteIds.length > 0
      ? db.from("esportes").select("id, nome").in("id", esporteIds)
      : Promise.resolve({ data: [] }),
  ]);

  const profileMap = new Map<string, Profile>(
    (profilesData ?? []).map((p) => [String((p as { id?: string }).id ?? ""), p as Profile])
  );
  const esporteMap = new Map<number, string>(
    (esportesData ?? []).map((e) => [Number((e as { id?: number }).id ?? 0), String((e as { nome?: string }).nome ?? "")])
  );

  function playerData(uid: string | null | undefined): { nome: string; avatarUrl: string | null } {
    if (!uid) return { nome: "—", avatarUrl: null };
    const p = profileMap.get(uid);
    return {
      nome: String(p?.nome ?? "").trim() || uid.slice(0, 8) + "…",
      avatarUrl: p?.avatar_url?.trim() || null,
    };
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-black text-eid-fg">Pedidos de desafio</h2>
        <p className="mt-1 text-sm text-eid-text-secondary">Tabela `matches` — últimos 200.</p>
      </div>
      <div className="grid gap-2">
        {rows.map((m) => {
          const sol = playerData(m.usuario_id);
          const adv = playerData(m.adversario_id);
          const esporteNome = esporteMap.get(Number(m.esporte_id ?? 0)) || `Esporte #${m.esporte_id ?? "?"}`;
          const dataFmt = fmtDate(m.data_solicitacao ?? m.data_registro);
          return (
            <article key={m.id} className="overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/70 shadow-sm">
              <div className="flex flex-wrap items-center gap-2 border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/40 px-3 py-2">
                <span className="rounded border border-[color:var(--eid-border-subtle)] bg-eid-surface/80 px-1.5 py-0.5 font-mono text-[10px] text-eid-text-secondary">
                  #{m.id}
                </span>
                <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.06em] ${statusBadge(m.status)}`}>
                  {m.status ?? "—"}
                </span>
                {m.modalidade_confronto && (
                  <span className="rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/60 px-2 py-0.5 text-[9px] font-semibold text-eid-text-secondary">
                    {m.modalidade_confronto}
                  </span>
                )}
                <span className="ml-auto text-[9px] font-semibold text-eid-text-secondary">{esporteNome}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 p-3">
                <PlayerChip nome={sol.nome} avatarUrl={sol.avatarUrl} />
                <span className="text-[10px] font-bold text-eid-text-secondary">vs</span>
                <PlayerChip nome={adv.nome} avatarUrl={adv.avatarUrl} />
                <span className="ml-auto text-[9px] text-eid-text-secondary">{dataFmt}</span>
              </div>
            </article>
          );
        })}
        {rows.length === 0 && (
          <p className="rounded-xl border border-[color:var(--eid-border-subtle)] px-4 py-6 text-center text-sm text-eid-text-secondary">
            Nenhum pedido encontrado.
          </p>
        )}
      </div>
    </div>
  );
}
