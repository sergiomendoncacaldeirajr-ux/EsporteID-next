"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  userId: string;
};

/**
 * Mantém páginas server-rendered (Agenda/Painel) atualizadas sem precisar fechar/reabrir o app.
 * Escuta mudanças relevantes e faz `router.refresh()` com debounce.
 */
export function RealtimePageRefresh({ userId }: Props) {
  const router = useRouter();
  const lastRefreshAt = useRef(0);
  const instanceIdRef = useRef(`rpr-${Math.random().toString(36).slice(2, 10)}`);
  const notifiedIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();

    const refresh = () => {
      const now = Date.now();
      if (now - lastRefreshAt.current < 1200) return;
      lastRefreshAt.current = now;
      router.refresh();
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
        // best-effort: não bloquear refresh se o browser recusar.
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
    const channelTag = `${userId}-${instanceIdRef.current}`;

    const channels = [
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
        .subscribe(),
      supabase
        .channel(`eid-refresh-match-u-${channelTag}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "matches", filter: `usuario_id=eq.${userId}` }, refresh)
        .subscribe(),
      supabase
        .channel(`eid-refresh-match-a-${channelTag}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "matches", filter: `adversario_id=eq.${userId}` }, refresh)
        .subscribe(),
      supabase
        .channel(`eid-refresh-partida-j1-${channelTag}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "partidas", filter: `jogador1_id=eq.${userId}` }, refresh)
        .subscribe(),
      supabase
        .channel(`eid-refresh-partida-j2-${channelTag}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "partidas", filter: `jogador2_id=eq.${userId}` }, refresh)
        .subscribe(),
    ];
    const intervalRefresh = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      refresh();
    }, 10000);

    return () => {
      window.clearInterval(intervalRefresh);
      channels.forEach((c) => void supabase.removeChannel(c));
    };
  }, [router, userId]);

  return null;
}

