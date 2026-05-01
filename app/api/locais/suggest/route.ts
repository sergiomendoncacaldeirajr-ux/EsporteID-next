import { NextResponse } from "next/server";
import { distanciaKm } from "@/lib/geo/distance-km";
import { createRouteHandlerClient } from "@/lib/supabase/server";

export const preferredRegion = ["gru1"];

type LocalRow = {
  id: number;
  slug: string | null;
  nome_publico: string | null;
  localizacao: string | null;
  lat: string | null;
  lng: string | null;
};

export async function GET(request: Request) {
  const supabase = await createRouteHandlerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, items: [] }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = String(searchParams.get("q") ?? "").trim();
  if (q.length < 3) return NextResponse.json({ ok: true, items: [] });

  const { data: profile } = await supabase.from("profiles").select("lat, lng").eq("id", user.id).maybeSingle();
  const myLat = Number(profile?.lat ?? NaN);
  const myLng = Number(profile?.lng ?? NaN);
  const hasCoords = Number.isFinite(myLat) && Number.isFinite(myLng);

  const { data, error } = await supabase.rpc("api_fold_search_espacos_listagem", {
    p_search: q,
    p_limit: 60,
  });
  if (error) {
    console.error("[locais/suggest] api_fold_search_espacos_listagem", error);
    return NextResponse.json({ ok: true, items: [] });
  }

  const rows = (data ?? []) as LocalRow[];
  const items = rows
    .map((row) => {
      const dist = hasCoords ? distanciaKm(myLat, myLng, Number(row.lat ?? NaN), Number(row.lng ?? NaN)) : 99999;
      return {
        id: Number(row.id),
        slug: row.slug ?? null,
        nome: row.nome_publico ?? "Local",
        localizacao: row.localizacao ?? null,
        distKm: Number.isFinite(dist) && dist < 9000 ? Number(dist.toFixed(2)) : null,
      };
    })
    .sort((a, b) => (a.distKm ?? 99999) - (b.distKm ?? 99999))
    .slice(0, 8);

  return NextResponse.json({ ok: true, items });
}
