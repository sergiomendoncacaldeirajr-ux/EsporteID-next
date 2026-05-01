"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  type ComunidadePendenciasServerSnapshot,
  pendenciasSnapshotSignature,
} from "@/lib/comunidade/pendencias-snapshot";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

export type { ComunidadePendenciasServerSnapshot };

function countFromSettled(r: PromiseSettledResult<{ count: number | null }>): number {
  if (r.status !== "fulfilled") return 0;
  return r.value.count ?? 0;
}

/** Mesmas contagens “head” que o servidor da /comunidade e o footer (candidaturas do líder via `times` que lidera). */
async function fetchRawPendenciasCounts(supabase: SupabaseClient, userId: string): Promise<ComunidadePendenciasServerSnapshot> {
  const { data: meusTimes } = await supabase.from("times").select("id").eq("criador_id", userId);
  const meusTimeIds = [
    ...new Set(
      (meusTimes ?? [])
        .map((t) => Number((t as { id?: number | null }).id ?? 0))
        .filter((id) => Number.isFinite(id) && id > 0),
    ),
  ];
  let candLider = 0;
  if (meusTimeIds.length > 0) {
    const { count } = await supabase
      .from("time_candidaturas")
      .select("id", { count: "exact", head: true })
      .in("time_id", meusTimeIds.slice(0, 100))
      .eq("status", "pendente");
    candLider = count ?? 0;
  }

  const settled = await Promise.allSettled([
    supabase.from("matches").select("id", { count: "exact", head: true }).eq("adversario_id", userId).eq("status", "Pendente"),
    supabase.from("matches").select("id", { count: "exact", head: true }).eq("usuario_id", userId).eq("status", "Pendente"),
    supabase.from("match_sugestoes").select("id", { count: "exact", head: true }).eq("alvo_dono_id", userId).eq("status", "pendente"),
    supabase
      .from("match_sugestoes")
      .select("id", { count: "exact", head: true })
      .eq("sugeridor_id", userId)
      .eq("status", "pendente")
      .neq("oculto_sugeridor", true),
    supabase.from("time_convites").select("id", { count: "exact", head: true }).eq("convidado_usuario_id", userId).eq("status", "pendente"),
    supabase.from("time_convites").select("id", { count: "exact", head: true }).eq("convidado_por_usuario_id", userId).eq("status", "pendente"),
    supabase.from("time_candidaturas").select("id", { count: "exact", head: true }).eq("candidato_usuario_id", userId).eq("status", "pendente"),
  ]);

  return {
    pedidosRec: countFromSettled(settled[0]!),
    pedidosEnv: countFromSettled(settled[1]!),
    sugRec: countFromSettled(settled[2]!),
    sugEnv: countFromSettled(settled[3]!),
    convRec: countFromSettled(settled[4]!),
    convEnv: countFromSettled(settled[5]!),
    candLider,
    candMine: countFromSettled(settled[6]!),
  };
}

/**
 * Mantém o Server Component da Comunidade alinhado ao Supabase: o miolo só muda com `router.refresh()`.
 * — Diff por assinatura estável (`snapshotSig`) evita corrida com objeto novo a cada voo RSC.
 * — Refresh periódico leve (fallback) recupera se diff falhar ou Realtime não entregar.
 */
export function ComunidadePendenciasRscSync({
  userId,
  snapshotSig,
}: {
  userId: string;
  /** `pendenciasSnapshotSignature(...)` no servidor — string primitiva. */
  snapshotSig: string;
}) {
  const router = useRouter();
  const routerRefreshRef = useRef(router.refresh);
  const serverSigRef = useRef(snapshotSig);
  const lastRefreshAt = useRef(0);
  const pollCycles = useRef(0);

  useEffect(() => {
    serverSigRef.current = snapshotSig;
  }, [snapshotSig]);

  useEffect(() => {
    routerRefreshRef.current = router.refresh;
  }, [router]);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    let cancelled = false;
    const registered: ReturnType<typeof supabase.channel>[] = [];

    const maybeRefresh = () => {
      if (cancelled) return;
      const now = Date.now();
      if (now - lastRefreshAt.current < 320) return;
      lastRefreshAt.current = now;
      void (async () => {
        try {
          await fetch("/api/comunidade/revalidate", { method: "POST", credentials: "same-origin" });
        } catch {
          /* ignore */
        }
        if (cancelled) return;
        queueMicrotask(() => routerRefreshRef.current());
      })();
    };

    async function tick() {
      if (cancelled) return;
      pollCycles.current += 1;
      try {
        const live = await fetchRawPendenciasCounts(supabase, userId);
        const liveSig = pendenciasSnapshotSignature(live);
        const stale = liveSig !== serverSigRef.current;
        /** A cada ~4s força refresh: cobre cache RSC / Realtime ausente. */
        const forceBeat = pollCycles.current % 4 === 0;
        if (stale || forceBeat) {
          maybeRefresh();
        }
      } catch {
        /* ignore */
      }
    }

    const interval = window.setInterval(() => void tick(), 1000);
    const onVis = () => {
      if (document.visibilityState === "visible") void tick();
    };
    document.addEventListener("visibilitychange", onVis);

    function idListInFilter(ids: number[]): string | null {
      if (ids.length === 0) return null;
      const list = ids.slice(0, 100).join(",");
      return `in.(${list})`;
    }

    void (async () => {
      const { data: meusTimes } = await supabase.from("times").select("id").eq("criador_id", userId);
      if (cancelled) return;
      const ownedIds = [
        ...new Set(
          (meusTimes ?? [])
            .map((t) => Number((t as { id?: number | null }).id ?? 0))
            .filter((id) => Number.isFinite(id) && id > 0),
        ),
      ].slice(0, 100);
      const ownedTimeFilter = idListInFilter(ownedIds);

      const chMatch = supabase
        .channel(`eid-comunidade-sync-match-${userId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "matches", filter: `adversario_id=eq.${userId}` }, maybeRefresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "matches", filter: `usuario_id=eq.${userId}` }, maybeRefresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "match_sugestoes", filter: `alvo_dono_id=eq.${userId}` }, maybeRefresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "match_sugestoes", filter: `sugeridor_id=eq.${userId}` }, maybeRefresh)
        .subscribe((status) => {
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") void tick();
        });
      if (cancelled) {
        void supabase.removeChannel(chMatch);
        return;
      }
      registered.push(chMatch);

      const chEquipe = supabase
        .channel(`eid-comunidade-sync-equipe-${userId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "time_convites", filter: `convidado_usuario_id=eq.${userId}` }, maybeRefresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "time_convites", filter: `convidado_por_usuario_id=eq.${userId}` }, maybeRefresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "time_candidaturas", filter: `candidato_usuario_id=eq.${userId}` }, maybeRefresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "times", filter: `criador_id=eq.${userId}` }, maybeRefresh);

      if (ownedTimeFilter) {
        chEquipe.on(
          "postgres_changes",
          { event: "*", schema: "public", table: "time_candidaturas", filter: `time_id=${ownedTimeFilter}` },
          maybeRefresh
        );
      }

      chEquipe.subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") void tick();
      });
      if (cancelled) {
        void supabase.removeChannel(chEquipe);
        return;
      }
      registered.push(chEquipe);
    })();

    const onRealtimeBridge = () => maybeRefresh();
    window.addEventListener("eid:realtime-refresh", onRealtimeBridge);

    void tick();

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("eid:realtime-refresh", onRealtimeBridge);
      for (const ch of registered) void supabase.removeChannel(ch);
    };
  }, [userId]);

  return null;
}
