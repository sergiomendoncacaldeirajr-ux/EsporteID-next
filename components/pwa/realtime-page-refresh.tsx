"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  EID_REALTIME_REFRESH_THROTTLE_MS,
  eidShouldPauseAutoRefreshFromLocation,
} from "@/lib/realtime/eid-realtime-config";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

type Props = {
  userId: string;
};

async function fetchMyTeamIds(supabase: SupabaseClient, userId: string): Promise<number[]> {
  const ids = new Set<number>();
  const { data: criadas } = await supabase.from("times").select("id").eq("criador_id", userId);
  for (const r of criadas ?? []) {
    const n = Number((r as { id?: number }).id ?? 0);
    if (Number.isFinite(n) && n > 0) ids.add(n);
  }
  const { data: mem } = await supabase
    .from("membros_time")
    .select("time_id")
    .eq("usuario_id", userId)
    .in("status", ["ativo", "aceito", "aprovado"]);
  for (const r of mem ?? []) {
    const n = Number((r as { time_id?: number }).time_id ?? 0);
    if (Number.isFinite(n) && n > 0) ids.add(n);
  }
  return [...ids];
}

async function fetchOwnedTeamIds(supabase: SupabaseClient, userId: string): Promise<number[]> {
  const { data } = await supabase.from("times").select("id").eq("criador_id", userId);
  return (data ?? [])
    .map((r) => Number((r as { id?: number }).id ?? 0))
    .filter((n) => Number.isFinite(n) && n > 0);
}

function idListInFilter(ids: number[]): string | null {
  if (ids.length === 0) return null;
  const list = ids.slice(0, 100).join(",");
  return `in.(${list})`;
}

function payloadNumberField(
  payload: unknown,
  field: string
): number | null {
  const p = payload as { new?: Record<string, unknown>; old?: Record<string, unknown> } | null;
  const vNew = p?.new?.[field];
  const vOld = p?.old?.[field];
  const nNew = Number(vNew ?? NaN);
  if (Number.isFinite(nNew) && nNew > 0) return nNew;
  const nOld = Number(vOld ?? NaN);
  if (Number.isFinite(nOld) && nOld > 0) return nOld;
  return null;
}

function payloadStringField(
  payload: unknown,
  field: string
): string | null {
  const p = payload as { new?: Record<string, unknown>; old?: Record<string, unknown> } | null;
  const vNew = String(p?.new?.[field] ?? "").trim();
  if (vNew) return vNew;
  const vOld = String(p?.old?.[field] ?? "").trim();
  return vOld || null;
}

/**
 * Atualização ao vivo global no app com shell autenticado: notificações, matches, partidas,
 * candidaturas, convites, sugestões, elenco. Tempos e escopo do poll em `eid-realtime-config`.
 */
export function RealtimePageRefresh({ userId }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  const lastRefreshAt = useRef(0);
  const instanceId = useId();
  const notifiedIdsRef = useRef<Set<number>>(new Set());
  const [elencoVersion, setElencoVersion] = useState(0);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    let cancelled = false;
    const channels: RealtimeChannel[] = [];

    const register = (ch: RealtimeChannel) => {
      if (cancelled) {
        void supabase.removeChannel(ch);
        return;
      }
      channels.push(ch);
    };

    const shouldPauseAutoRefresh = () => eidShouldPauseAutoRefreshFromLocation();

    const revalidateCurrentRouteIfNeeded = async () => {
      const p = String(pathnameRef.current ?? "") || "/";
      try {
        await fetch("/api/realtime/revalidate-current", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: p }),
        });
      } catch {
        /* ignore */
      }
    };

    const refresh = () => {
      if (shouldPauseAutoRefresh()) return;
      const now = Date.now();
      if (now - lastRefreshAt.current < EID_REALTIME_REFRESH_THROTTLE_MS) return;
      lastRefreshAt.current = now;
      void (async () => {
        await revalidateCurrentRouteIfNeeded();
        if (cancelled) return;
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("eid:realtime-refresh"));
        }
        router.refresh();
      })();
    };
    const refreshForced = () => {
      if (shouldPauseAutoRefresh()) return;
      lastRefreshAt.current = Date.now();
      void (async () => {
        await revalidateCurrentRouteIfNeeded();
        if (cancelled) return;
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("eid:realtime-refresh"));
        }
        router.refresh();
      })();
    };

    const notifyForeground = (notifId: number, mensagem: string) => {
      if (!Number.isFinite(notifId) || notifId < 1) return;
      if (notifiedIdsRef.current.has(notifId)) return;
      notifiedIdsRef.current.add(notifId);
      if (typeof window === "undefined") return;
      if (!("Notification" in window)) return;
      if (Notification.permission !== "granted") return;
      try {
        new Notification("EsporteID", {
          body: String(mensagem ?? "").trim() || "Você recebeu uma nova notificação.",
          tag: `eid-foreground-${notifId}`,
        });
      } catch {
        /* ignore */
      }
    };

    const primeNotifiedCache = async () => {
      const { data } = await supabase
        .from("notificacoes")
        .select("id")
        .eq("usuario_id", userId)
        .order("id", { ascending: false })
        .limit(80);
      for (const row of data ?? []) {
        const id = Number((row as { id?: number } | null)?.id ?? 0);
        if (Number.isFinite(id) && id > 0) notifiedIdsRef.current.add(id);
      }
    };
    void primeNotifiedCache();

    const onElencoChange = () => {
      // Troca de cargo / elenco: não pode cair no throttle — quem recebe liderança precisa ver a UI na hora.
      refreshForced();
      window.setTimeout(() => setElencoVersion((v) => v + 1), 0);
    };

    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      if (shouldPauseAutoRefresh()) return;
      refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const channelTag = `${userId}-${instanceId}-${pathname}-${elencoVersion}`;

    void (async () => {
      const [teamIds, ownedIds] = await Promise.all([
        fetchMyTeamIds(supabase, userId),
        fetchOwnedTeamIds(supabase, userId),
      ]);
      if (cancelled) return;

      const teamFilter = idListInFilter(teamIds);
      const ownedFilter = idListInFilter(ownedIds);
      const ownedSet = new Set(ownedIds);

      if (teamFilter) {
        /** Dupla/time: pedidos e recusas em `matches` não passam por `usuario_id`/`adversario_id` de todo o elenco. */
        register(
          supabase
            .channel(`eid-refresh-match-des-time-${channelTag}`)
            .on(
              "postgres_changes",
              { event: "*", schema: "public", table: "matches", filter: `desafiante_time_id=${teamFilter}` },
              refresh
            )
            .subscribe()
        );
        register(
          supabase
            .channel(`eid-refresh-match-adv-time-${channelTag}`)
            .on(
              "postgres_changes",
              { event: "*", schema: "public", table: "matches", filter: `adversario_time_id=${teamFilter}` },
              refresh
            )
            .subscribe()
        );
        register(
          supabase
            .channel(`eid-refresh-partida-t1-${channelTag}`)
            .on(
              "postgres_changes",
              { event: "*", schema: "public", table: "partidas", filter: `time1_id=${teamFilter}` },
              refresh
            )
            .subscribe()
        );
        register(
          supabase
            .channel(`eid-refresh-partida-t2-${channelTag}`)
            .on(
              "postgres_changes",
              { event: "*", schema: "public", table: "partidas", filter: `time2_id=${teamFilter}` },
              refresh
            )
            .subscribe()
        );
        register(
          supabase
            .channel(`eid-refresh-membros-time-${channelTag}`)
            .on(
              "postgres_changes",
              { event: "*", schema: "public", table: "membros_time", filter: `time_id=${teamFilter}` },
              refreshForced
            )
            .subscribe()
        );
        register(
          supabase
            .channel(`eid-refresh-times-${channelTag}`)
            .on(
              "postgres_changes",
              { event: "*", schema: "public", table: "times", filter: `id=${teamFilter}` },
              refreshForced
            )
            .subscribe()
        );
        register(
          supabase
            .channel(`eid-refresh-eid-coletivo-${channelTag}`)
            .on(
              "postgres_changes",
              { event: "*", schema: "public", table: "historico_eid_coletivo", filter: `time_id=${teamFilter}` },
              refresh
            )
            .subscribe()
        );
      }

      register(
        supabase
          .channel(`eid-refresh-notif-${channelTag}`)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "notificacoes", filter: `usuario_id=eq.${userId}` },
            (payload) => {
              const ev = String((payload as { eventType?: string } | null)?.eventType ?? "").toUpperCase();
              if (ev === "INSERT") {
                const row = (payload as { new?: { id?: number; mensagem?: string | null } } | null)?.new;
                notifyForeground(Number(row?.id ?? 0), String(row?.mensagem ?? ""));
              }
              refresh();
            }
          )
          .subscribe()
      );
      register(
        supabase
          .channel(`eid-refresh-match-u-${channelTag}`)
          .on("postgres_changes", { event: "*", schema: "public", table: "matches", filter: `usuario_id=eq.${userId}` }, refresh)
          .subscribe()
      );
      register(
        supabase
          .channel(`eid-refresh-match-a-${channelTag}`)
          .on("postgres_changes", { event: "*", schema: "public", table: "matches", filter: `adversario_id=eq.${userId}` }, refresh)
          .subscribe()
      );
      register(
        supabase
          .channel(`eid-refresh-partida-j1-${channelTag}`)
          .on("postgres_changes", { event: "*", schema: "public", table: "partidas", filter: `jogador1_id=eq.${userId}` }, refresh)
          .subscribe()
      );
      register(
        supabase
          .channel(`eid-refresh-partida-j2-${channelTag}`)
          .on("postgres_changes", { event: "*", schema: "public", table: "partidas", filter: `jogador2_id=eq.${userId}` }, refresh)
          .subscribe()
      );

      register(
        supabase
          .channel(`eid-refresh-cand-cand-${channelTag}`)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "time_candidaturas", filter: `candidato_usuario_id=eq.${userId}` },
            refresh
          )
          .subscribe()
      );
      register(
        supabase
          .channel(`eid-refresh-cand-all-${channelTag}`)
          .on("postgres_changes", { event: "*", schema: "public", table: "time_candidaturas" }, (payload) => {
            const candidatoId = payloadStringField(payload, "candidato_usuario_id");
            const timeId = payloadNumberField(payload, "time_id");
            if (candidatoId === userId || (timeId != null && ownedSet.has(timeId))) {
              refreshForced();
            }
          })
          .subscribe()
      );
      if (ownedFilter) {
        register(
          supabase
            .channel(`eid-refresh-cand-time-${channelTag}`)
            .on(
              "postgres_changes",
              { event: "*", schema: "public", table: "time_candidaturas", filter: `time_id=${ownedFilter}` },
              refresh
            )
            .subscribe()
        );
        register(
          supabase
            .channel(`eid-refresh-convite-time-${channelTag}`)
            .on(
              "postgres_changes",
              { event: "*", schema: "public", table: "time_convites", filter: `time_id=${ownedFilter}` },
              refreshForced
            )
            .subscribe()
        );
      }

      register(
        supabase
          .channel(`eid-refresh-convite-eu-${channelTag}`)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "time_convites", filter: `convidado_usuario_id=eq.${userId}` },
            refreshForced
          )
          .subscribe()
      );
      register(
        supabase
          .channel(`eid-refresh-eid-individual-${channelTag}`)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "usuario_eid", filter: `usuario_id=eq.${userId}` },
            refresh
          )
          .subscribe()
      );
      register(
        supabase
          .channel(`eid-refresh-convite-enviei-${channelTag}`)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "time_convites", filter: `convidado_por_usuario_id=eq.${userId}` },
            refreshForced
          )
          .subscribe()
      );

      register(
        supabase
          .channel(`eid-refresh-sug-sug-${channelTag}`)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "match_sugestoes", filter: `sugeridor_id=eq.${userId}` },
            refresh
          )
          .subscribe()
      );
      register(
        supabase
          .channel(`eid-refresh-sug-alvo-${channelTag}`)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "match_sugestoes", filter: `alvo_dono_id=eq.${userId}` },
            refresh
          )
          .subscribe()
      );

      register(
        supabase
          .channel(`eid-refresh-membros-eu-${channelTag}`)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "membros_time", filter: `usuario_id=eq.${userId}` },
            onElencoChange
          )
          .subscribe()
      );

    })();

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      channels.forEach((c) => void supabase.removeChannel(c));
    };
  }, [router, userId, pathname, elencoVersion, instanceId]);

  return null;
}
