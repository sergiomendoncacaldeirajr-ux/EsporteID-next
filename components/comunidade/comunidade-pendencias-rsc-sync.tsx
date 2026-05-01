"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ComunidadePendenciasServerSnapshot = {
  pedidosRec: number;
  pedidosEnv: number;
  sugRec: number;
  sugEnv: number;
  convRec: number;
  convEnv: number;
  candLider: number;
  candMine: number;
};

function serialize(s: ComunidadePendenciasServerSnapshot): string {
  return `${s.pedidosRec}|${s.pedidosEnv}|${s.sugRec}|${s.sugEnv}|${s.convRec}|${s.convEnv}|${s.candLider}|${s.candMine}`;
}

/** Mesmas contagens “head” usadas no servidor da /comunidade (evita falso positivo com listas filtradas). */
async function fetchRawPendenciasCounts(supabase: SupabaseClient, userId: string): Promise<ComunidadePendenciasServerSnapshot> {
  const [
    { count: pedidosRec },
    { count: pedidosEnv },
    { count: sugRec },
    { count: sugEnv },
    { count: convRec },
    { count: convEnv },
    { count: candLider },
    { count: candMine },
  ] = await Promise.all([
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
    supabase
      .from("time_candidaturas")
      .select("id", { count: "exact", head: true })
      .eq("status", "pendente")
      .eq("times.criador_id", userId),
    supabase.from("time_candidaturas").select("id", { count: "exact", head: true }).eq("candidato_usuario_id", userId).eq("status", "pendente"),
  ]);

  return {
    pedidosRec: pedidosRec ?? 0,
    pedidosEnv: pedidosEnv ?? 0,
    sugRec: sugRec ?? 0,
    sugEnv: sugEnv ?? 0,
    convRec: convRec ?? 0,
    convEnv: convEnv ?? 0,
    candLider: candLider ?? 0,
    candMine: candMine ?? 0,
  };
}

/**
 * Mantém o Server Component da Comunidade alinhado ao Supabase: o footer/sino atualizam no cliente,
 * mas o miolo da página só muda com `router.refresh()`. Este bridge detecta divergência nas contagens
 * brutas e força o refresh (polling leve + realtime).
 */
export function ComunidadePendenciasRscSync({
  userId,
  snapshot,
}: {
  userId: string;
  snapshot: ComunidadePendenciasServerSnapshot;
}) {
  const router = useRouter();
  const serverSigRef = useRef(serialize(snapshot));
  const lastRefreshAt = useRef(0);

  useEffect(() => {
    serverSigRef.current = serialize(snapshot);
  }, [snapshot]);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    let cancelled = false;

    const maybeRefresh = () => {
      if (cancelled) return;
      const now = Date.now();
      if (now - lastRefreshAt.current < 600) return;
      lastRefreshAt.current = now;
      router.refresh();
    };

    async function tick() {
      if (cancelled || document.visibilityState !== "visible") return;
      try {
        const live = await fetchRawPendenciasCounts(supabase, userId);
        if (serialize(live) !== serverSigRef.current) {
          maybeRefresh();
        }
      } catch {
        /* ignore */
      }
    }

    const interval = window.setInterval(() => void tick(), 2000);
    const onVis = () => {
      if (document.visibilityState === "visible") void tick();
    };
    document.addEventListener("visibilitychange", onVis);

    const channel = supabase
      .channel(`eid-comunidade-pendencias-sync-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "matches", filter: `adversario_id=eq.${userId}` }, maybeRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "matches", filter: `usuario_id=eq.${userId}` }, maybeRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "match_sugestoes", filter: `alvo_dono_id=eq.${userId}` }, maybeRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "match_sugestoes", filter: `sugeridor_id=eq.${userId}` }, maybeRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "time_convites", filter: `convidado_usuario_id=eq.${userId}` }, maybeRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "time_convites", filter: `convidado_por_usuario_id=eq.${userId}` }, maybeRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "time_candidaturas", filter: `candidato_usuario_id=eq.${userId}` }, maybeRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "time_candidaturas" }, maybeRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "times", filter: `criador_id=eq.${userId}` }, maybeRefresh)
      .subscribe();

    const onRealtimeBridge = () => maybeRefresh();
    window.addEventListener("eid:realtime-refresh", onRealtimeBridge);

    void tick();

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("eid:realtime-refresh", onRealtimeBridge);
      void supabase.removeChannel(channel);
    };
  }, [userId, router]);

  return null;
}
