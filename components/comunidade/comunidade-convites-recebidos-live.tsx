"use client";

import { ComunidadeConvitesTime, type ConviteTimeItem } from "@/components/comunidade/comunidade-convites-time";
import { ComunidadeQuadro } from "@/components/comunidade/comunidade-quadro";
import { setComunidadePendenciasOverride } from "@/lib/comunidade/comunidade-client-pendencias-override";
import { fetchConvitesComunidadeCliente } from "@/lib/comunidade/fetch-convites-comunidade-client";
import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useRef, useState } from "react";

export function ComunidadeConvitesRecebidosLive({
  initialItems,
  userId,
  viewerLat,
  viewerLng,
}: {
  initialItems: ConviteTimeItem[];
  userId: string;
  viewerLat: number | null;
  viewerLng: number | null;
}) {
  const [items, setItems] = useState(initialItems);
  const coords =
    viewerLat != null && viewerLng != null && Number.isFinite(viewerLat) && Number.isFinite(viewerLng)
      ? { lat: viewerLat, lng: viewerLng }
      : null;

  const applyServer = useCallback(
    (next: ConviteTimeItem[]) => {
      setItems(next);
      setComunidadePendenciasOverride({ convRec: next.length });
    },
    [],
  );

  const refetch = useCallback(async () => {
    const supabase = createClient();
    const { recebidos } = await fetchConvitesComunidadeCliente(supabase, userId, coords);
    applyServer(recebidos);
  }, [userId, coords, applyServer]);

  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  useEffect(() => {
    setItems(initialItems);
    setComunidadePendenciasOverride({ convRec: initialItems.length });
  }, [initialItems]);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`eid-comunidade-conv-rec-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "time_convites", filter: `convidado_usuario_id=eq.${userId}` },
        () => void refetchRef.current(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  return (
    <ComunidadeQuadro id="equipe-convites" title="Convites recebidos" hasPending={items.length > 0}>
      <ComunidadeConvitesTime items={items} />
    </ComunidadeQuadro>
  );
}
