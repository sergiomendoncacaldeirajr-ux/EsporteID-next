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

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();

    const refresh = () => {
      const now = Date.now();
      if (now - lastRefreshAt.current < 1200) return;
      lastRefreshAt.current = now;
      router.refresh();
    };

    const channels = [
      supabase
        .channel(`eid-refresh-notif-${userId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "notificacoes", filter: `usuario_id=eq.${userId}` },
          refresh
        )
        .subscribe(),
      supabase
        .channel(`eid-refresh-match-u-${userId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "matches", filter: `usuario_id=eq.${userId}` }, refresh)
        .subscribe(),
      supabase
        .channel(`eid-refresh-match-a-${userId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "matches", filter: `adversario_id=eq.${userId}` }, refresh)
        .subscribe(),
      supabase
        .channel(`eid-refresh-partida-j1-${userId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "partidas", filter: `jogador1_id=eq.${userId}` }, refresh)
        .subscribe(),
      supabase
        .channel(`eid-refresh-partida-j2-${userId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "partidas", filter: `jogador2_id=eq.${userId}` }, refresh)
        .subscribe(),
    ];

    return () => {
      channels.forEach((c) => void supabase.removeChannel(c));
    };
  }, [router, userId]);

  return null;
}

