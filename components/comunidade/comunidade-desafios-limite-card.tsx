import type { SupabaseClient } from "@supabase/supabase-js";
import { Activity, Zap } from "lucide-react";
import { getMatchRankMonthlyLimitPerSport } from "@/lib/app-config/match-rank-monthly-limit";
import { countRankingConfrontosNoMesIndividual } from "@/lib/match/ranking-monthly-usage";

type UsuarioEsporteRow = {
  esporte_id: number | null;
  esportes?: { nome: string | null } | { nome: string | null }[] | null;
};

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

export async function ComunidadeDesafiosLimiteCard({ supabase, userId }: { supabase: SupabaseClient; userId: string }) {
  const [{ data: esporteRow }, limite] = await Promise.all([
    supabase
      .from("usuario_eid")
      .select("esporte_id, esportes(nome)")
      .eq("usuario_id", userId)
      .order("esporte_id", { ascending: true })
      .limit(1)
      .maybeSingle(),
    getMatchRankMonthlyLimitPerSport(supabase),
  ]);
  const row = esporteRow as UsuarioEsporteRow | null;
  const esporteId = Number(row?.esporte_id ?? 0);
  if (!Number.isFinite(esporteId) || esporteId < 1) return null;

  const usados = await countRankingConfrontosNoMesIndividual(supabase, userId, esporteId);
  const limiteSeguro = Math.max(1, Number(limite) || 1);
  const restantes = Math.max(0, limiteSeguro - usados);
  const pct = Math.max(0, Math.min(100, Math.round((Math.min(usados, limiteSeguro) / limiteSeguro) * 100)));
  const esporteNome = firstRelation(row?.esportes)?.nome?.trim() || "Esporte";
  const cheio = restantes <= 0;

  return (
    <section className="mb-3 overflow-hidden rounded-2xl border border-eid-primary-500/18 bg-[radial-gradient(circle_at_88%_22%,color-mix(in_srgb,var(--eid-action-500)_15%,transparent),transparent_34%),linear-gradient(160deg,color-mix(in_srgb,var(--eid-card)_96%,var(--eid-primary-500)_4%),color-mix(in_srgb,var(--eid-surface)_94%,transparent))] px-3 py-2.5 shadow-[0_12px_30px_-26px_rgba(15,23,42,0.75),inset_0_1px_0_rgba(255,255,255,0.045)] md:mb-4">
      <div className="flex items-center gap-3">
        <div className="relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-eid-action-500/35 bg-eid-action-500/12 text-eid-action-300 shadow-[0_10px_22px_-18px_rgba(249,115,22,0.85)]">
          <Activity className="h-5 w-5" strokeWidth={2.5} aria-hidden />
          <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full border border-eid-primary-500/35 bg-eid-primary-500 text-[8px] font-black text-white">
            {restantes}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[8px] font-black uppercase tracking-[0.16em] text-eid-action-400">Desafios do mês</p>
              <p className="mt-0.5 truncate text-[12px] font-black leading-tight text-eid-fg">
                {usados}/{limiteSeguro} usados
                <span className="font-semibold text-eid-text-secondary"> · {esporteNome}</span>
              </p>
            </div>
            <span
              className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-[0.06em] ${
                cheio
                  ? "border-amber-500/40 bg-amber-500/12 text-amber-300"
                  : "border-emerald-500/35 bg-emerald-500/10 text-emerald-300"
              }`}
            >
              <Zap className="h-3 w-3" strokeWidth={2.4} aria-hidden />
              {restantes} livre{restantes === 1 ? "" : "s"}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-eid-surface/70 ring-1 ring-[color:var(--eid-border-subtle)]">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,var(--eid-action-500),var(--eid-primary-500))] shadow-[0_0_14px_-5px_rgba(249,115,22,0.75)]"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
