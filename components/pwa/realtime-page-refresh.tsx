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

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();

    const refresh = () => {
      const now = Date.now();
      if (now - lastRefreshAt.current < 1200) return;
      lastRefreshAt.current = now;
      router.refresh();
    };
    const channelTag = `${userId}-${instanceIdRef.current}`;

    const channels = [
      supabase
        .channel(`eid-refresh-notif-${channelTag}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "notificacoes", filter: `usuario_id=eq.${userId}` },
          refresh
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

    return () => {
      channels.forEach((c) => void supabase.removeChannel(c));
    };
  }, [router, userId]);

  return null;
}

