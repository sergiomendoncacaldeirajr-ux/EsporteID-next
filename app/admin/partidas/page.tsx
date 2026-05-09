import Link from "next/link";
import {
  adminCancelarLimparPartida,
  adminDefinirResultadoPartida,
  adminSetMatchAgendamentoJanelaHoras,
  adminSetMatchAgendamentoAceiteHoras,
  adminSetMatchCancelamentoRespostaHoras,
  adminSetMatchResultadoAutoAprovacaoHoras,
  adminSetMatchRankCooldownMeses,
  adminSetMatchRankPendingLimit,
  adminSetMatchRankMonthlyLimitPerSport,
} from "@/app/admin/actions";
import { EidCancelAction } from "@/components/ui/eid-cancel-action";
import { getMatchAgendamentoJanelaHoras, getMatchAgendamentoAceiteHoras, getMatchCancelamentoRespostaHoras } from "@/lib/app-config/match-prazos";
import { createServiceRoleClient, hasServiceRoleConfig } from "@/lib/supabase/service-role";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type TimeRow = { id: number; nome?: string | null; escudo?: string | null; tipo?: string | null };

function tipoFormacaoLabel(tipo: string | null | undefined): string {
  return String(tipo ?? "").trim().toLowerCase() === "dupla" ? "Dupla" : "Time";
}

function ladoExibicaoAdmin(
  row: { jogador1_id?: string | null; jogador2_id?: string | null; time1_id?: number | null; time2_id?: number | null },
  side: 1 | 2,
  profileMap: Map<string, { nome?: string | null; avatar_url?: string | null }>,
  timeMap: Map<number, TimeRow>
): { label: string; sub?: string; imageUrl: string | null; imageRounded: "full" | "xl" } | null {
  const tid = side === 1 ? Number(row.time1_id ?? 0) : Number(row.time2_id ?? 0);
  const uid = side === 1 ? row.jogador1_id : row.jogador2_id;
  if (Number.isFinite(tid) && tid > 0) {
    const t = timeMap.get(tid);
    return { label: String(t?.nome ?? "").trim() || `Formação #${tid}`, sub: tipoFormacaoLabel(t?.tipo ?? null), imageUrl: t?.escudo?.trim() || null, imageRounded: "xl" };
  }
  if (uid) {
    const pf = profileMap.get(uid);
    return { label: String(pf?.nome ?? "").trim() || uid, sub: undefined, imageUrl: pf?.avatar_url?.trim() || null, imageRounded: "full" };
  }
  return null;
}

function statusColor(status: string): string {
  const s = status.toLowerCase();
  if (s === "agendada") return "border-sky-500/35 bg-sky-500/10 text-sky-300";
  if (s === "aguardando_confirmacao" || s === "aguardando_aceite_agendamento") return "border-amber-500/35 bg-amber-500/10 text-amber-300";
  if (s === "concluida" || s === "concluído" || s === "concluido") return "border-emerald-500/35 bg-emerald-500/10 text-emerald-300";
  if (s === "cancelada") return "border-rose-500/35 bg-rose-500/10 text-rose-300";
  return "border-[color:var(--eid-border-subtle)] bg-eid-surface/50 text-eid-text-secondary";
}

function rankingColor(sr: string): string {
  const s = sr.toLowerCase();
  if (s === "validado") return "border-emerald-500/35 bg-emerald-500/10 text-emerald-300";
  if (s === "resultado_contestado" || s === "contestado") return "border-rose-500/35 bg-rose-500/10 text-rose-300";
  if (s === "em_analise_admin") return "border-violet-500/35 bg-violet-500/10 text-violet-300";
  if (s === "pendente") return "border-amber-500/35 bg-amber-500/10 text-amber-300";
  return "border-[color:var(--eid-border-subtle)] bg-eid-surface/50 text-eid-text-secondary";
}

function PrazoCard({
  color,
  icon,
  tag,
  title,
  desc,
  value,
  unit,
  min,
  max,
  fieldName,
  action,
}: {
  color: string;
  icon: React.ReactNode;
  tag: string;
  title: string;
  desc: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  fieldName: string;
  action: (fd: FormData) => Promise<void>;
}) {
  return (
    <section className={`flex flex-col rounded-2xl border bg-eid-card/60 p-4 transition hover:bg-eid-card/90 ${color.replace("text-", "border-").replace(/\/\d+$/, "/25")}`}>
      <div className="flex items-start justify-between gap-2">
        <div className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${color.replace("text-", "bg-").replace(/\/\d+$/, "/15")}`}>
          {icon}
        </div>
        <div className="text-right">
          <span className={`block text-3xl font-black leading-none ${color}`}>{value}</span>
          <span className="text-[10px] text-eid-text-secondary">{unit}</span>
        </div>
      </div>
      <p className={`mt-2 text-[9px] font-black uppercase tracking-[0.1em] ${color}`}>{tag}</p>
      <p className="text-sm font-bold text-eid-fg">{title}</p>
      <p className="mt-0.5 flex-1 text-[11px] leading-snug text-eid-text-secondary">{desc}</p>
      <form action={action} className="mt-3 flex items-center gap-2">
        <input
          type="number"
          name={fieldName}
          defaultValue={value}
          min={min}
          max={max}
          className="eid-input-dark h-9 w-24 rounded-lg px-2 text-sm text-eid-fg"
        />
        <button
          type="submit"
          className={`rounded-lg border px-3 py-2 text-[11px] font-black uppercase tracking-wide transition ${color.replace("text-", "border-").replace(/\/\d+$/, "/40")} ${color.replace("text-", "bg-").replace(/\/\d+$/, "/12")} ${color} hover:${color.replace("text-", "bg-").replace(/\/\d+$/, "/22")}`}
        >
          Salvar
        </button>
        <span className="text-[10px] text-eid-text-secondary whitespace-nowrap">{min}–{max}</span>
      </form>
    </section>
  );
}

export default async function AdminPartidasPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const flash = typeof sp.adm_flash === "string" ? sp.adm_flash : "";
  if (!hasServiceRoleConfig()) {
    return <p className="text-sm text-eid-text-secondary">Configure a service role.</p>;
  }
  const db = createServiceRoleClient();

  // ── Fetch all config values in parallel ───────────────────────────────────
  const [
    janelaHoras,
    aceiteHoras,
    cancelRespostaHoras,
    autoApproveRow,
    cooldownRow,
    pendingLimitRow,
    monthlyLimitRow,
    { data, error },
  ] = await Promise.all([
    getMatchAgendamentoJanelaHoras(db),
    getMatchAgendamentoAceiteHoras(db),
    getMatchCancelamentoRespostaHoras(db),
    db.from("app_config").select("value_json").eq("key", "match_resultado_autoaprovacao_horas").maybeSingle(),
    db.from("app_config").select("value_json").eq("key", "match_rank_cooldown_meses").maybeSingle(),
    db.from("app_config").select("value_json").eq("key", "match_rank_pending_result_limit").maybeSingle(),
    db.from("app_config").select("value_json").eq("key", "match_rank_monthly_limit_per_sport").maybeSingle(),
    db
      .from("partidas")
      .select("id, match_id, status, status_ranking, esporte_id, jogador1_id, jogador2_id, time1_id, time2_id, torneio_id, data_partida, criado_em")
      .order("id", { ascending: false })
      .limit(200),
  ]);

  function readN(vj: unknown, key: string, def: number, max: number): number {
    if (vj && typeof vj === "object" && !Array.isArray(vj) && key in vj) {
      const n = Number((vj as Record<string, unknown>)[key]);
      if (Number.isFinite(n) && n >= 1) return Math.min(max, Math.floor(n));
    }
    return def;
  }
  const autoApproveHoras = readN(autoApproveRow.data?.value_json, "horas", 24, 168);
  const cooldownMeses = readN(cooldownRow.data?.value_json, "meses", 12, 120);
  const pendingLimit = readN(pendingLimitRow.data?.value_json, "limite", 2, 20);
  const monthlyLimit = readN(monthlyLimitRow.data?.value_json, "limite", 4, 60);

  if (error) return <p className="text-sm text-red-300">{error.message}</p>;
  const rows = data ?? [];

  // ── Stats ─────────────────────────────────────────────────────────────────
  const statsAgendadas = rows.filter((r) => String(r.status ?? "").toLowerCase() === "agendada").length;
  const statsAguardando = rows.filter((r) =>
    ["aguardando_confirmacao", "aguardando_aceite_agendamento"].includes(String(r.status ?? "").toLowerCase())
  ).length;
  const statsContestadas = rows.filter((r) =>
    ["resultado_contestado", "contestado"].includes(String(r.status_ranking ?? "").toLowerCase())
  ).length;
  const statsAtivas = rows.filter((r) => !["cancelada", "concluida", "concluído", "concluido"].includes(String(r.status ?? "").toLowerCase())).length;

  // ── Build lookup maps ─────────────────────────────────────────────────────
  const userIds = [...new Set(rows.flatMap((r) => [r.jogador1_id, r.jogador2_id]).filter(Boolean))] as string[];
  const timeIds = [...new Set(rows.flatMap((r) => [Number(r.time1_id ?? 0), Number(r.time2_id ?? 0)]).filter((n) => n > 0))];
  const esporteIds = [...new Set(rows.map((r) => Number(r.esporte_id ?? 0)).filter((n) => n > 0))];
  const [{ data: profilesRows }, { data: esportesRows }, { data: timesRows }] = await Promise.all([
    userIds.length > 0 ? db.from("profiles").select("id, nome, avatar_url").in("id", userIds) : Promise.resolve({ data: [] }),
    esporteIds.length > 0 ? db.from("esportes").select("id, nome").in("id", esporteIds) : Promise.resolve({ data: [] }),
    timeIds.length > 0 ? db.from("times").select("id, nome, escudo, tipo").in("id", timeIds) : Promise.resolve({ data: [] }),
  ]);
  const profileMap = new Map((profilesRows ?? []).map((p) => [String((p as { id?: string }).id ?? ""), p as { nome?: string | null; avatar_url?: string | null }]));
  const esporteMap = new Map((esportesRows ?? []).map((e) => [Number((e as { id?: number }).id ?? 0), String((e as { nome?: string }).nome ?? "")]));
  const timeMap = new Map<number, TimeRow>();
  for (const t of timesRows ?? []) {
    const id = Number((t as { id?: number }).id ?? 0);
    if (id > 0) timeMap.set(id, t as TimeRow);
  }

  return (
    <div className="space-y-8">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-xl font-black text-eid-fg">Partidas &amp; Prazos</h2>
        <p className="mt-1 text-sm text-eid-text-secondary">
          Controle total: prazos operacionais, limites de ranking e histórico de partidas. Regras de pontuação em{" "}
          <Link href="/admin/regras" className="font-semibold text-eid-primary-300 hover:underline">Regras e Ranking</Link>.
        </p>
      </div>

      {/* ── Flash messages ─────────────────────────────────────────────────── */}
      {flash === "partida_limpar_ok" && (
        <p className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-200">Partida cancelada/limpa.</p>
      )}
      {flash === "partida_resultado_ok" && (
        <p className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-200">Resultado definido pelo admin.</p>
      )}
      {(flash === "partida_limpar_invalida" || flash === "partida_limpar_nao_encontrada" || flash === "partida_limpar_erro") && (
        <p className="rounded-xl border border-rose-500/35 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200">Não foi possível limpar a partida.</p>
      )}
      {(flash === "partida_resultado_invalido" || flash === "partida_resultado_erro") && (
        <p className="rounded-xl border border-rose-500/35 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200">Não foi possível definir o resultado.</p>
      )}

      {/* ── Stats bar ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Ativas (últimas 200)", value: statsAtivas, color: "text-eid-primary-300 bg-eid-primary-500/10 border-eid-primary-500/25" },
          { label: "Agendadas", value: statsAgendadas, color: "text-sky-300 bg-sky-500/10 border-sky-500/25" },
          { label: "Aguard. resultado", value: statsAguardando, color: "text-amber-300 bg-amber-500/10 border-amber-500/25" },
          { label: "Contestadas", value: statsContestadas, color: "text-rose-300 bg-rose-500/10 border-rose-500/25" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border p-3 ${s.color}`}>
            <p className="text-2xl font-black leading-none">{s.value}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em] opacity-80">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Prazos & Controles ─────────────────────────────────────────────── */}
      <div>
        <h3 className="flex items-center gap-2 text-base font-black text-eid-fg">
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-eid-primary-400" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" />
          </svg>
          Prazos &amp; Controles
        </h3>
        <p className="mt-1 text-xs text-eid-text-secondary">Todos os parâmetros operacionais de desafio e ranking em um só lugar.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

          {/* 1 — Janela de agendamento */}
          <section className="flex flex-col rounded-2xl border border-blue-500/25 bg-eid-card/60 p-4 transition hover:bg-eid-card/90">
            <div className="flex items-start justify-between gap-2">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/15">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
              </span>
              <div className="text-right"><span className="block text-3xl font-black leading-none text-blue-400">{janelaHoras}</span><span className="text-[10px] text-eid-text-secondary">horas</span></div>
            </div>
            <p className="mt-2 text-[9px] font-black uppercase tracking-[0.1em] text-blue-400">Agendamento</p>
            <p className="text-sm font-bold text-eid-fg">Janela de agendamento</p>
            <p className="mt-0.5 flex-1 text-[11px] leading-snug text-eid-text-secondary">Prazo para marcar data e local após o desafio ser aceito.</p>
            <form action={adminSetMatchAgendamentoJanelaHoras} className="mt-3 flex items-center gap-2">
              <input type="number" name="horas" defaultValue={janelaHoras} min={1} max={720} className="eid-input-dark h-9 w-24 rounded-lg px-2 text-sm text-eid-fg"/>
              <button type="submit" className="rounded-lg border border-blue-500/40 bg-blue-500/12 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-blue-300 transition hover:bg-blue-500/22">Salvar</button>
              <span className="whitespace-nowrap text-[10px] text-eid-text-secondary">1–720</span>
            </form>
          </section>

          {/* 2 — Aceite de agendamento */}
          <section className="flex flex-col rounded-2xl border border-teal-500/25 bg-eid-card/60 p-4 transition hover:bg-eid-card/90">
            <div className="flex items-start justify-between gap-2">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-500/15">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-teal-400" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M20 6 9 17l-5-5"/></svg>
              </span>
              <div className="text-right"><span className="block text-3xl font-black leading-none text-teal-400">{aceiteHoras}</span><span className="text-[10px] text-eid-text-secondary">horas</span></div>
            </div>
            <p className="mt-2 text-[9px] font-black uppercase tracking-[0.1em] text-teal-400">Agendamento</p>
            <p className="text-sm font-bold text-eid-fg">Aceite de agendamento</p>
            <p className="mt-0.5 flex-1 text-[11px] leading-snug text-eid-text-secondary">Prazo para o oponente aceitar a data/local proposta.</p>
            <form action={adminSetMatchAgendamentoAceiteHoras} className="mt-3 flex items-center gap-2">
              <input type="number" name="horas" defaultValue={aceiteHoras} min={1} max={168} className="eid-input-dark h-9 w-24 rounded-lg px-2 text-sm text-eid-fg"/>
              <button type="submit" className="rounded-lg border border-teal-500/40 bg-teal-500/12 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-teal-300 transition hover:bg-teal-500/22">Salvar</button>
              <span className="whitespace-nowrap text-[10px] text-eid-text-secondary">1–168</span>
            </form>
          </section>

          {/* 3 — Autoaprovação de resultado */}
          <section className="flex flex-col rounded-2xl border border-emerald-500/25 bg-eid-card/60 p-4 transition hover:bg-eid-card/90">
            <div className="flex items-start justify-between gap-2">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><circle cx="12" cy="12" r="9"/><path d="m9 12 2 2 4-4"/></svg>
              </span>
              <div className="text-right"><span className="block text-3xl font-black leading-none text-emerald-400">{autoApproveHoras}</span><span className="text-[10px] text-eid-text-secondary">horas</span></div>
            </div>
            <p className="mt-2 text-[9px] font-black uppercase tracking-[0.1em] text-emerald-400">Resultado</p>
            <p className="text-sm font-bold text-eid-fg">Autoaprovação de resultado</p>
            <p className="mt-0.5 flex-1 text-[11px] leading-snug text-eid-text-secondary">Prazo para autoaprovar resultado pendente sem contestação do oponente.</p>
            <form action={adminSetMatchResultadoAutoAprovacaoHoras} className="mt-3 flex items-center gap-2">
              <input type="number" name="horas" defaultValue={autoApproveHoras} min={1} max={168} className="eid-input-dark h-9 w-24 rounded-lg px-2 text-sm text-eid-fg"/>
              <button type="submit" className="rounded-lg border border-emerald-500/40 bg-emerald-500/12 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-emerald-300 transition hover:bg-emerald-500/22">Salvar</button>
              <span className="whitespace-nowrap text-[10px] text-eid-text-secondary">1–168</span>
            </form>
          </section>

          {/* 4 — Resposta ao cancelamento */}
          <section className="flex flex-col rounded-2xl border border-amber-500/25 bg-eid-card/60 p-4 transition hover:bg-eid-card/90">
            <div className="flex items-start justify-between gap-2">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg>
              </span>
              <div className="text-right"><span className="block text-3xl font-black leading-none text-amber-400">{cancelRespostaHoras}</span><span className="text-[10px] text-eid-text-secondary">horas</span></div>
            </div>
            <p className="mt-2 text-[9px] font-black uppercase tracking-[0.1em] text-amber-400">Cancelamento</p>
            <p className="text-sm font-bold text-eid-fg">Resposta ao cancelamento</p>
            <p className="mt-0.5 flex-1 text-[11px] leading-snug text-eid-text-secondary">Prazo de resposta ao pedido de cancelamento de desafio.</p>
            <form action={adminSetMatchCancelamentoRespostaHoras} className="mt-3 flex items-center gap-2">
              <input type="number" name="horas" defaultValue={cancelRespostaHoras} min={1} max={336} className="eid-input-dark h-9 w-24 rounded-lg px-2 text-sm text-eid-fg"/>
              <button type="submit" className="rounded-lg border border-amber-500/40 bg-amber-500/12 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-amber-300 transition hover:bg-amber-500/22">Salvar</button>
              <span className="whitespace-nowrap text-[10px] text-eid-text-secondary">1–336</span>
            </form>
          </section>

          {/* 5 — Carência entre adversários */}
          <section className="flex flex-col rounded-2xl border border-violet-500/25 bg-eid-card/60 p-4 transition hover:bg-eid-card/90">
            <div className="flex items-start justify-between gap-2">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/15">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-violet-400" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
              </span>
              <div className="text-right"><span className="block text-3xl font-black leading-none text-violet-400">{cooldownMeses}</span><span className="text-[10px] text-eid-text-secondary">meses</span></div>
            </div>
            <p className="mt-2 text-[9px] font-black uppercase tracking-[0.1em] text-violet-400">Ranking</p>
            <p className="text-sm font-bold text-eid-fg">Carência entre adversários</p>
            <p className="mt-0.5 flex-1 text-[11px] leading-snug text-eid-text-secondary">Período mínimo entre confrontos de ranking do mesmo par no mesmo esporte.</p>
            <form action={adminSetMatchRankCooldownMeses} className="mt-3 flex items-center gap-2">
              <input type="number" name="meses" defaultValue={cooldownMeses} min={1} max={120} className="eid-input-dark h-9 w-24 rounded-lg px-2 text-sm text-eid-fg"/>
              <button type="submit" className="rounded-lg border border-violet-500/40 bg-violet-500/12 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-violet-300 transition hover:bg-violet-500/22">Salvar</button>
              <span className="whitespace-nowrap text-[10px] text-eid-text-secondary">1–120</span>
            </form>
          </section>

          {/* 6 — Limite de pendências */}
          <section className="flex flex-col rounded-2xl border border-rose-500/25 bg-eid-card/60 p-4 transition hover:bg-eid-card/90">
            <div className="flex items-start justify-between gap-2">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/15">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-rose-400" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
              </span>
              <div className="text-right"><span className="block text-3xl font-black leading-none text-rose-400">{pendingLimit}</span><span className="text-[10px] text-eid-text-secondary">jogos</span></div>
            </div>
            <p className="mt-2 text-[9px] font-black uppercase tracking-[0.1em] text-rose-400">Ranking</p>
            <p className="text-sm font-bold text-eid-fg">Limite de pendências</p>
            <p className="mt-0.5 flex-1 text-[11px] leading-snug text-eid-text-secondary">Máx. de resultados pendentes por jogador antes de abrir novo desafio.</p>
            <form action={adminSetMatchRankPendingLimit} className="mt-3 flex items-center gap-2">
              <input type="number" name="limite" defaultValue={pendingLimit} min={1} max={20} className="eid-input-dark h-9 w-24 rounded-lg px-2 text-sm text-eid-fg"/>
              <button type="submit" className="rounded-lg border border-rose-500/40 bg-rose-500/12 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-rose-300 transition hover:bg-rose-500/22">Salvar</button>
              <span className="whitespace-nowrap text-[10px] text-eid-text-secondary">1–20</span>
            </form>
          </section>

          {/* 7 — Limite mensal */}
          <section className="flex flex-col rounded-2xl border border-sky-500/25 bg-eid-card/60 p-4 transition hover:bg-eid-card/90">
            <div className="flex items-start justify-between gap-2">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/15">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-sky-400" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></svg>
              </span>
              <div className="text-right"><span className="block text-3xl font-black leading-none text-sky-400">{monthlyLimit}</span><span className="text-[10px] text-eid-text-secondary">/mês</span></div>
            </div>
            <p className="mt-2 text-[9px] font-black uppercase tracking-[0.1em] text-sky-400">Ranking</p>
            <p className="text-sm font-bold text-eid-fg">Limite mensal por esporte</p>
            <p className="mt-0.5 flex-1 text-[11px] leading-snug text-eid-text-secondary">Máx. de confrontos de ranking por usuário por esporte no mês corrente.</p>
            <form action={adminSetMatchRankMonthlyLimitPerSport} className="mt-3 flex items-center gap-2">
              <input type="number" name="limite" defaultValue={monthlyLimit} min={1} max={60} className="eid-input-dark h-9 w-24 rounded-lg px-2 text-sm text-eid-fg"/>
              <button type="submit" className="rounded-lg border border-sky-500/40 bg-sky-500/12 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-sky-300 transition hover:bg-sky-500/22">Salvar</button>
              <span className="whitespace-nowrap text-[10px] text-eid-text-secondary">1–60</span>
            </form>
          </section>

        </div>
      </div>

      {/* ── Partidas recentes ──────────────────────────────────────────────── */}
      <div>
        <h3 className="flex items-center gap-2 text-base font-black text-eid-fg">
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-eid-primary-400" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="8.5" cy="9" r="2.4"/><circle cx="15.5" cy="10" r="2.1"/><path d="M4.5 18a4 4 0 0 1 8 0"/><path d="M13.5 17.8a3.4 3.4 0 0 1 4.5-3.2"/>
          </svg>
          Partidas recentes
        </h3>
        <p className="mt-1 text-xs text-eid-text-secondary">Últimas 200 partidas. Gerencie resultados e cancelamentos aqui.</p>
        <div className="mt-4 grid gap-2">
          {rows.map((p) => {
            const status = String(p.status ?? "").trim().toLowerCase();
            const statusRanking = String(p.status_ranking ?? "").trim().toLowerCase();
            const jaCancelada = status === "cancelada" || statusRanking === "cancelado_admin";
            const jaConcluida = ["concluida","concluído","concluido","validada","finalizada"].includes(status) || statusRanking === "validado";
            const podeLimpar = !jaCancelada;
            const podeDefinirResultado = !jaCancelada && !jaConcluida;
            const lado1 = ladoExibicaoAdmin(p, 1, profileMap, timeMap);
            const lado2 = ladoExibicaoAdmin(p, 2, profileMap, timeMap);
            return (
              <article key={p.id} className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/60 p-3 transition hover:bg-eid-card/90">
                {/* Header row */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/55 px-2 py-0.5 font-mono text-[10px] text-eid-text-secondary">#{p.id}</span>
                  {p.match_id && <span className="rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/55 px-2 py-0.5 font-mono text-[10px] text-eid-text-secondary">match {p.match_id}</span>}
                  <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.06em] ${statusColor(p.status ?? "")}`}>{p.status ?? "—"}</span>
                  {statusRanking && statusRanking !== "null" && (
                    <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.06em] ${rankingColor(statusRanking)}`}>{statusRanking}</span>
                  )}
                  {p.torneio_id && (
                    <Link href={`/torneios/${p.torneio_id}`} target="_blank" rel="noreferrer" className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.06em] text-violet-300 hover:underline">
                      torneio {p.torneio_id}
                    </Link>
                  )}
                  <span className="ml-auto text-[10px] text-eid-text-secondary">
                    {esporteMap.get(Number(p.esporte_id ?? 0)) || `esp #${p.esporte_id}`}
                    {" · "}
                    {p.data_partida ? new Date(p.data_partida).toLocaleDateString("pt-BR") : p.criado_em ? new Date(p.criado_em).toLocaleDateString("pt-BR") : "—"}
                  </span>
                </div>

                {/* Players */}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {[lado1, lado2].map((lado, idx) => {
                    if (!lado) return null;
                    const rounded = lado.imageRounded === "xl" ? "rounded-xl" : "rounded-full";
                    return (
                      <span key={`${p.id}-lado-${idx}`} className="inline-flex max-w-[220px] items-center gap-1.5 rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 px-1.5 py-0.5 text-[10px]">
                        <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden border border-[color:var(--eid-border-subtle)] bg-eid-surface text-[8px] font-bold text-eid-fg ${rounded}`}>
                          {lado.imageUrl ? <img src={lado.imageUrl} alt="" className="h-full w-full object-cover" /> : String(lado.label).slice(0, 1).toUpperCase()}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-eid-fg">{lado.label}</span>
                          {lado.sub && <span className="block truncate text-[9px] text-eid-text-secondary">{lado.sub}</span>}
                        </span>
                      </span>
                    );
                  })}
                  {lado1 && lado2 && <span className="text-[10px] font-bold text-eid-text-secondary">vs</span>}
                </div>

                {/* Actions */}
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <Link href={`/registrar-placar/${p.id}?from=/admin/partidas&admin=1`} className="rounded-lg border border-eid-primary-500/45 bg-eid-primary-500/12 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.05em] text-eid-primary-200 transition hover:bg-eid-primary-500/22">
                    Abrir lançador
                  </Link>
                  {podeDefinirResultado && (
                    <form action={adminDefinirResultadoPartida} className="flex flex-wrap items-center gap-1.5">
                      <input type="hidden" name="partida_id" value={p.id} />
                      <select name="winner_side" defaultValue="1" className="eid-input-dark h-8 rounded-lg border border-[color:var(--eid-border-subtle)] px-1.5 text-[10px]">
                        <option value="1">Venceu: {lado1?.label ?? "lado 1"}</option>
                        <option value="2">Venceu: {lado2?.label ?? "lado 2"}</option>
                      </select>
                      <input type="number" name="placar_1" min={0} defaultValue={1} className="eid-input-dark h-8 w-12 rounded-lg border border-[color:var(--eid-border-subtle)] px-1 text-[10px]"/>
                      <span className="text-[10px] text-eid-text-secondary">×</span>
                      <input type="number" name="placar_2" min={0} defaultValue={0} className="eid-input-dark h-8 w-12 rounded-lg border border-[color:var(--eid-border-subtle)] px-1 text-[10px]"/>
                      <button type="submit" className="rounded-lg border border-emerald-500/45 bg-emerald-500/12 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.05em] text-emerald-300 transition hover:bg-emerald-500/22">Definir resultado</button>
                    </form>
                  )}
                  {podeLimpar && (
                    <form action={adminCancelarLimparPartida}>
                      <input type="hidden" name="partida_id" value={p.id} />
                      <EidCancelAction label="Cancelar/Limpar" compact className="rounded-lg" />
                    </form>
                  )}
                  {!podeLimpar && !podeDefinirResultado && (
                    <span className="rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.05em] text-eid-text-secondary">Encerrada</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
