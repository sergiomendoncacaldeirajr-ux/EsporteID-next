"use server";

import { revalidatePath } from "next/cache";
import { getServerAuth } from "@/lib/auth/rsc-auth";
import {
  fetchMatchRadarCards,
  type MatchRadarCard,
  type MatchRadarFinalidade,
  type RadarSnapshotInput,
  type RadarTipo,
  type SortBy,
} from "@/lib/match/radar-snapshot";
import { nextDisponivelAmistosoPayload } from "@/lib/perfil/disponivel-amistoso";
import { createClient } from "@/lib/supabase/server";

export type MatchLocationResult = { ok: true } | { ok: false; message: string };

export async function atualizarLocalizacaoMatch(lat: number, lng: number): Promise<MatchLocationResult> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { ok: false, message: "Coordenadas inválidas." };
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { ok: false, message: "Coordenadas fora do intervalo válido." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sessão expirada. Faça login novamente." };

  const { error } = await supabase
    .from("profiles")
    .update({ lat, lng, atualizado_em: new Date().toISOString() })
    .eq("id", user.id);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/match");
  revalidatePath("/dashboard");
  return { ok: true };
}

export type RefreshMatchRadarResult =
  | { ok: true; cards: MatchRadarCard[] }
  | { ok: false; error: "auth" | "no_location" | "no_maioridade" };

/** Recarrega lista do radar sem navegação (filtros no cliente). */
export async function refreshMatchRadarAction(input: {
  tipo: RadarTipo;
  sortBy: SortBy;
  raio: number;
  esporteSelecionado: string;
  finalidade: MatchRadarFinalidade;
  includeActiveOpponents?: boolean;
}): Promise<RefreshMatchRadarResult> {
  const { supabase, user } = await getServerAuth();
  if (!user) return { ok: false, error: "auth" };

  const { data: me } = await supabase
    .from("profiles")
    .select("lat, lng, match_maioridade_confirmada")
    .eq("id", user.id)
    .maybeSingle();

  if (!(me as { match_maioridade_confirmada?: boolean } | null)?.match_maioridade_confirmada) {
    return { ok: false, error: "no_maioridade" };
  }

  const lat = Number(me?.lat);
  const lng = Number(me?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { ok: false, error: "no_location" };
  }

  const snap: RadarSnapshotInput = {
    viewerId: user.id,
    tipo: input.tipo,
    sortBy: input.sortBy,
    raio: input.raio,
    esporteSelecionado: input.esporteSelecionado,
    lat,
    lng,
    finalidade: input.finalidade,
    includeActiveOpponents: input.includeActiveOpponents === true,
  };

  const cards = await fetchMatchRadarCards(supabase, snap);
  return { ok: true, cards };
}

export type SetDisponivelResult = { ok: true } | { ok: false; error: string };

export async function setViewerDisponivelAmistoso(disponivel: boolean): Promise<SetDisponivelResult> {
  const { supabase, user } = await getServerAuth();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const payload = nextDisponivelAmistosoPayload(disponivel);
  const { error } = await supabase.from("profiles").update(payload).eq("id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/match");
  revalidatePath(`/perfil/${user.id}`);
  return { ok: true };
}
