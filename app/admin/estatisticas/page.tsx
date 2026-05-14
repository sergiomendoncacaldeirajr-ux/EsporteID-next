import Link from "next/link";
import type { ReactNode } from "react";
import { Activity, Clock3, MapPin, MousePointerClick, Trophy, Users } from "lucide-react";
import { createServiceRoleClient, hasServiceRoleConfig } from "@/lib/supabase/service-role";

type ActivityRow = {
  user_id: string;
  last_seen_at: string | null;
  last_path: string | null;
  localizacao: string | null;
  total_active_seconds: number | null;
  heartbeat_count: number | null;
};

type ProfileRow = {
  id: string;
  nome: string | null;
  username: string | null;
  localizacao: string | null;
  criado_em?: string | null;
};

type UsuarioEidRow = {
  usuario_id: string;
  esporte_id: number | null;
};

type EsporteRow = {
  id: number;
  nome: string | null;
};

type PartidaRow = {
  esporte_id: number | null;
  jogador1_id: string | null;
  jogador2_id: string | null;
  time1_id: number | null;
  time2_id: number | null;
  status: string | null;
  status_ranking: string | null;
};

type TimeRow = {
  id: number;
  criador_id: string | null;
  esporte_id: number | null;
};

type MembroTimeRow = {
  time_id: number | null;
  usuario_id: string | null;
  status: string | null;
};

const ONLINE_WINDOW_MS = 5 * 60 * 1000;

function locationLabel(value: string | null | undefined) {
  const clean = String(value ?? "").replace(/\s+/g, " ").trim();
  return clean || "Local não informado";
}

function secondsLabel(value: number | null | undefined) {
  const total = Math.max(0, Math.round(Number(value ?? 0)));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  if (m > 0) return `${m}min`;
  return `${total}s`;
}

function dateLabel(value: string | null | undefined) {
  if (!value) return "Sem registro";
  try {
    return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "Sem registro";
  }
}

function isFinished(row: PartidaRow) {
  const status = String(row.status ?? "").trim().toLowerCase();
  const ranking = String(row.status_ranking ?? "").trim().toLowerCase();
  return ranking === "validado" || ["concluida", "concluída", "concluido", "concluído", "finalizada", "encerrada", "validada"].includes(status);
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: ReactNode }) {
  return (
    <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/70 p-4 shadow-[0_12px_32px_-26px_rgba(15,23,42,0.7)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-eid-text-secondary">{label}</p>
        <span className="grid h-9 w-9 place-items-center rounded-xl border border-eid-primary-500/25 bg-eid-primary-500/10 text-eid-primary-300">
          {icon}
        </span>
      </div>
      <p className="mt-3 text-3xl font-black tabular-nums text-eid-fg">{value}</p>
    </div>
  );
}

export default async function AdminEstatisticasPage() {
  if (!hasServiceRoleConfig()) {
    return <p className="text-sm text-eid-text-secondary">Configure a service role.</p>;
  }

  const db = createServiceRoleClient();
  const [{ data: activityRows }, { data: profiles }, { data: usuarioEid }, { data: esportes }, { data: partidas }, { data: times }, { data: membros }] = await Promise.all([
    db.from("admin_user_activity").select("*").order("last_seen_at", { ascending: false }).limit(1200),
    db.from("profiles").select("id, nome, username, localizacao, criado_em").limit(6000),
    db.from("usuario_eid").select("usuario_id, esporte_id").limit(10000),
    db.from("esportes").select("id, nome").limit(200),
    db
      .from("partidas")
      .select("esporte_id, jogador1_id, jogador2_id, time1_id, time2_id, status, status_ranking")
      .is("torneio_id", null)
      .limit(12000),
    db.from("times").select("id, criador_id, esporte_id").limit(8000),
    db.from("membros_time").select("time_id, usuario_id, status").limit(12000),
  ]);

  const profileRows = (profiles ?? []) as ProfileRow[];
  const activity = (activityRows ?? []) as ActivityRow[];
  const esporteNome = new Map((esportes ?? []).map((e) => [Number((e as EsporteRow).id), (e as EsporteRow).nome ?? `Esporte #${(e as EsporteRow).id}`]));
  const profileById = new Map(profileRows.map((p) => [p.id, p]));
  // Server Component: o painel precisa do instante atual para calcular "online nos últimos 5 min".
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const onlineRows = activity.filter((row) => {
    const t = row.last_seen_at ? new Date(row.last_seen_at).getTime() : 0;
    return Number.isFinite(t) && now - t <= ONLINE_WINDOW_MS;
  });

  const onlineByLocation = new Map<string, number>();
  for (const row of onlineRows) {
    const loc = locationLabel(row.localizacao ?? profileById.get(row.user_id)?.localizacao ?? null);
    onlineByLocation.set(loc, (onlineByLocation.get(loc) ?? 0) + 1);
  }

  const userIdsWithResultBySport = new Map<number, Set<string>>();
  const teamsById = new Map(((times ?? []) as TimeRow[]).map((t) => [Number(t.id), t]));
  const membersByTeam = new Map<number, Set<string>>();
  for (const t of (times ?? []) as TimeRow[]) {
    if (t.criador_id) {
      const set = membersByTeam.get(Number(t.id)) ?? new Set<string>();
      set.add(t.criador_id);
      membersByTeam.set(Number(t.id), set);
    }
  }
  for (const m of (membros ?? []) as MembroTimeRow[]) {
    const status = String(m.status ?? "").trim().toLowerCase();
    if (status && !["ativo", "aceito", "aprovado"].includes(status)) continue;
    const timeId = Number(m.time_id ?? 0);
    const uid = String(m.usuario_id ?? "").trim();
    if (!timeId || !uid) continue;
    const set = membersByTeam.get(timeId) ?? new Set<string>();
    set.add(uid);
    membersByTeam.set(timeId, set);
  }

  for (const p of ((partidas ?? []) as PartidaRow[]).filter(isFinished)) {
    const esporteId = Number(p.esporte_id ?? 0);
    if (!Number.isFinite(esporteId) || esporteId < 1) continue;
    const set = userIdsWithResultBySport.get(esporteId) ?? new Set<string>();
    for (const uid of [p.jogador1_id, p.jogador2_id]) {
      if (uid) set.add(uid);
    }
    for (const timeIdRaw of [p.time1_id, p.time2_id]) {
      const timeId = Number(timeIdRaw ?? 0);
      if (timeId > 0) {
        for (const uid of membersByTeam.get(timeId) ?? []) set.add(uid);
        const team = teamsById.get(timeId);
        if (team?.criador_id) set.add(team.criador_id);
      }
    }
    userIdsWithResultBySport.set(esporteId, set);
  }

  const sportLocation = new Map<string, { esporteId: number; esporte: string; localizacao: string; cadastrados: Set<string>; comResultado: Set<string> }>();
  for (const row of (usuarioEid ?? []) as UsuarioEidRow[]) {
    const uid = String(row.usuario_id ?? "").trim();
    const esporteId = Number(row.esporte_id ?? 0);
    if (!uid || !Number.isFinite(esporteId) || esporteId < 1) continue;
    const loc = locationLabel(profileById.get(uid)?.localizacao ?? null);
    const key = `${esporteId}:${loc}`;
    const bucket =
      sportLocation.get(key) ??
      { esporteId, esporte: esporteNome.get(esporteId) ?? `Esporte #${esporteId}`, localizacao: loc, cadastrados: new Set<string>(), comResultado: new Set<string>() };
    bucket.cadastrados.add(uid);
    if (userIdsWithResultBySport.get(esporteId)?.has(uid)) bucket.comResultado.add(uid);
    sportLocation.set(key, bucket);
  }
  const sportLocationRows = [...sportLocation.values()]
    .map((row) => ({
      ...row,
      cadastradosCount: row.cadastrados.size,
      comResultadoCount: row.comResultado.size,
      soCadastroCount: Math.max(0, row.cadastrados.size - row.comResultado.size),
    }))
    .sort((a, b) => b.cadastradosCount - a.cadastradosCount)
    .slice(0, 80);

  const totalActive = activity.reduce((sum, row) => sum + Math.max(0, Number(row.total_active_seconds ?? 0)), 0);
  const topActive = [...activity].sort((a, b) => Number(b.total_active_seconds ?? 0) - Number(a.total_active_seconds ?? 0)).slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-eid-primary-300">Estatísticas</p>
        <h1 className="mt-1 text-2xl font-black text-eid-fg">Atividade da plataforma</h1>
        <p className="mt-1 max-w-3xl text-sm text-eid-text-secondary">
          Usuários online, tempo ativo estimado, páginas acessadas e distribuição por esporte/localização.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Online agora" value={onlineRows.length} icon={<Activity className="h-4 w-4" aria-hidden />} />
        <StatCard label="Usuários rastreados" value={activity.length} icon={<Users className="h-4 w-4" aria-hidden />} />
        <StatCard label="Tempo ativo total" value={secondsLabel(totalActive)} icon={<Clock3 className="h-4 w-4" aria-hidden />} />
        <StatCard label="Esporte/local" value={sportLocationRows.length} icon={<Trophy className="h-4 w-4" aria-hidden />} />
      </div>

      <section className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/60 p-4">
        <h2 className="text-base font-black text-eid-fg">Online por localização</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {[...onlineByLocation.entries()].sort((a, b) => b[1] - a[1]).slice(0, 18).map(([loc, count]) => (
            <div key={loc} className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2">
              <span className="inline-flex min-w-0 items-center gap-2 text-sm font-bold text-eid-fg">
                <MapPin className="h-4 w-4 shrink-0 text-eid-primary-300" aria-hidden />
                <span className="truncate">{loc}</span>
              </span>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-black text-emerald-300">{count}</span>
            </div>
          ))}
          {onlineByLocation.size === 0 ? <p className="text-sm text-eid-text-secondary">Nenhum usuário online nos últimos 5 minutos.</p> : null}
        </div>
      </section>

      <section className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/60 p-4">
        <h2 className="text-base font-black text-eid-fg">Usuários por esporte e localização</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-[color:var(--eid-border-subtle)]">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="bg-eid-surface/70 text-[10px] font-black uppercase tracking-[0.08em] text-eid-text-secondary">
              <tr>
                <th className="px-3 py-2">Esporte</th>
                <th className="px-3 py-2">Localização</th>
                <th className="px-3 py-2">Total cadastrados</th>
                <th className="px-3 py-2">Com jogo lançado</th>
                <th className="px-3 py-2">Só cadastro</th>
              </tr>
            </thead>
            <tbody>
              {sportLocationRows.map((row) => (
                <tr key={`${row.esporteId}:${row.localizacao}`} className="border-t border-[color:var(--eid-border-subtle)]/70">
                  <td className="px-3 py-2 font-bold text-eid-fg">{row.esporte}</td>
                  <td className="px-3 py-2 text-eid-text-secondary">{row.localizacao}</td>
                  <td className="px-3 py-2"><span className="rounded-full bg-eid-primary-500/12 px-2 py-1 font-black text-eid-primary-300">{row.cadastradosCount}</span></td>
                  <td className="px-3 py-2"><span className="rounded-full bg-emerald-500/10 px-2 py-1 font-black text-emerald-300">{row.comResultadoCount}</span></td>
                  <td className="px-3 py-2"><span className="rounded-full bg-eid-action-500/10 px-2 py-1 font-black text-eid-action-300">{row.soCadastroCount}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/60 p-4">
        <h2 className="text-base font-black text-eid-fg">Usuários mais ativos</h2>
        <div className="mt-3 grid gap-2">
          {topActive.map((row) => {
            const p = profileById.get(row.user_id);
            return (
              <Link key={row.user_id} href={`/admin/usuarios/${row.user_id}`} className="grid gap-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2 transition hover:border-eid-primary-500/35 md:grid-cols-[1fr_auto_auto] md:items-center">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black text-eid-fg">{p?.nome ?? "Usuário"}</span>
                  <span className="block truncate text-[11px] text-eid-text-secondary">{locationLabel(row.localizacao ?? p?.localizacao)} · {row.last_path ?? "/"}</span>
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-eid-primary-300"><Clock3 className="h-3.5 w-3.5" aria-hidden />{secondsLabel(row.total_active_seconds)}</span>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-eid-text-secondary"><MousePointerClick className="h-3.5 w-3.5" aria-hidden />{dateLabel(row.last_seen_at)}</span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
