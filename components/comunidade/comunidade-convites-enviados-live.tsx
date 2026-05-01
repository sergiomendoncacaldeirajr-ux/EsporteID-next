"use client";

import {
  ComunidadeConvitesEnviadosTime,
  type ConviteTimeEnviadoItem,
} from "@/components/comunidade/comunidade-convites-enviados-time";
import { ComunidadeQuadro } from "@/components/comunidade/comunidade-quadro";
import { setComunidadePendenciasOverride } from "@/lib/comunidade/comunidade-client-pendencias-override";
import { fetchConvitesComunidadeCliente } from "@/lib/comunidade/fetch-convites-comunidade-client";
import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useRef, useState } from "react";

function soPendentes(list: ConviteTimeEnviadoItem[]) {
  return list.filter((i) => String(i.status ?? "").trim().toLowerCase() === "pendente");
}

export function ComunidadeConvitesEnviadosLive({
  initialItems,
  userId,
  viewerLat,
  viewerLng,
}: {
  initialItems: ConviteTimeEnviadoItem[];
  userId: string;
  viewerLat: number | null;
  viewerLng: number | null;
}) {
  const [items, setItems] = useState(initialItems);
  const coords =
    viewerLat != null && viewerLng != null && Number.isFinite(viewerLat) && Number.isFinite(viewerLng)
      ? { lat: viewerLat, lng: viewerLng }
      : null;

  const applyServer = useCallback((next: ConviteTimeEnviadoItem[]) => {
    setItems(next);
    setComunidadePendenciasOverride({ convEnv: soPendentes(next).length });
  }, []);

  const refetch = useCallback(async () => {
    const supabase = createClient();
    const { enviados } = await fetchConvitesComunidadeCliente(supabase, userId, coords);
    applyServer(enviados);
  }, [userId, coords, applyServer]);

  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  useEffect(() => {
    setItems(initialItems);
    setComunidadePendenciasOverride({ convEnv: soPendentes(initialItems).length });
  }, [initialItems]);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`eid-comunidade-conv-env-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "time_convites", filter: `convidado_por_usuario_id=eq.${userId}` },
        () => void refetchRef.current(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  const pendentes = soPendentes(items);

  return (
    <ComunidadeQuadro
      id="equipe-convites-enviados"
      title="Convites enviados (aguardando resposta)"
      hasPending={pendentes.length > 0}
    >
      <ComunidadeConvitesEnviadosTime items={pendentes} />
    </ComunidadeQuadro>
  );
}
