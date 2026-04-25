import { NextResponse } from "next/server";
import { distanciaKm } from "@/lib/geo/distance-km";
import { createRouteHandlerClient } from "@/lib/supabase/server";

type Scope = "global" | "times" | "torneios" | "locais";

export async function GET(request: Request) {
  const supabase = await createRouteHandlerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, items: [] }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = String(searchParams.get("q") ?? "").trim();
  const scope = String(searchParams.get("scope") ?? "global") as Scope;
  if (q.length < 3) return NextResponse.json({ ok: true, items: [] });
  const like = `%${q}%`;

  const { data: me } = await supabase.from("profiles").select("lat, lng").eq("id", user.id).maybeSingle();
  const myLat = Number(me?.lat ?? NaN);
  const myLng = Number(me?.lng ?? NaN);
  const hasCoords = Number.isFinite(myLat) && Number.isFinite(myLng);

  if (scope === "times") {
    const { data } = await supabase
      .from("times")
      .select("id, nome, localizacao")
      .or(`nome.ilike.${like},localizacao.ilike.${like}`)
      .order("id", { ascending: false })
      .limit(8);
    return NextResponse.json({
      ok: true,
      items: (data ?? []).map((row) => ({
        id: `time-${row.id}`,
        value: String(row.nome ?? ""),
        title: row.nome ?? "Time",
        subtitle: row.localizacao ?? "Sem localização",
        href: `/perfil-time/${row.id}?from=/times`,
      })),
    });
  }

  if (scope === "torneios") {
    const { data } = await supabase
      .from("torneios")
      .select("id, nome, status")
      .ilike("nome", like)
      .order("criado_em", { ascending: false })
      .limit(8);
    return NextResponse.json({
      ok: true,
      items: (data ?? []).map((row) => ({
        id: `torneio-${row.id}`,
        value: String(row.nome ?? ""),
        title: row.nome ?? "Torneio",
        subtitle: row.status ? `Status: ${row.status}` : null,
        href: `/torneios/${row.id}?from=/torneios`,
      })),
    });
  }

  if (scope === "locais") {
    const { data } = await supabase
      .from("espacos_genericos")
      .select("id, slug, nome_publico, localizacao, lat, lng")
      .eq("ativo_listagem", true)
      .or(`nome_publico.ilike.${like},localizacao.ilike.${like}`)
      .limit(30);
    const items = (data ?? [])
      .map((row) => {
        const dist = hasCoords ? distanciaKm(myLat, myLng, Number(row.lat ?? NaN), Number(row.lng ?? NaN)) : 99999;
        return {
          id: `local-${row.id}`,
          value: String(row.nome_publico ?? ""),
          title: row.nome_publico ?? "Local",
          subtitle:
            row.localizacao != null
              ? `${row.localizacao}${Number.isFinite(dist) && dist < 9000 ? ` · ${dist.toFixed(1).replace(".", ",")} km` : ""}`
              : "Sem localização",
          href: row.slug ? `/espaco/${row.slug}` : `/local/${row.id}?from=/locais`,
          dist,
        };
      })
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 8)
      .map((item) => ({
        id: item.id,
        value: item.value,
        title: item.title,
        subtitle: item.subtitle,
        href: item.href,
      }));
    return NextResponse.json({ ok: true, items });
  }

  const [atletas, locais, times, torneios] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, nome, username")
      .or(`nome.ilike.${like},username.ilike.${like}`)
      .limit(6),
    supabase
      .from("espacos_genericos")
      .select("id, slug, nome_publico, localizacao, lat, lng")
      .eq("ativo_listagem", true)
      .or(`nome_publico.ilike.${like},localizacao.ilike.${like}`)
      .limit(16),
    supabase
      .from("times")
      .select("id, nome, localizacao")
      .or(`nome.ilike.${like},localizacao.ilike.${like}`)
      .limit(6),
    supabase.from("torneios").select("id, nome, status").ilike("nome", like).limit(6),
  ]);

  const localItems = (locais.data ?? [])
    .map((row) => {
      const dist = hasCoords ? distanciaKm(myLat, myLng, Number(row.lat ?? NaN), Number(row.lng ?? NaN)) : 99999;
      return {
        id: `local-${row.id}`,
        value: String(row.nome_publico ?? ""),
        title: row.nome_publico ?? "Local",
        subtitle:
          row.localizacao != null
            ? `${row.localizacao}${Number.isFinite(dist) && dist < 9000 ? ` · ${dist.toFixed(1).replace(".", ",")} km` : ""}`
            : "Sem localização",
        href: row.slug ? `/espaco/${row.slug}` : `/local/${row.id}?from=/buscar`,
        dist,
      };
    })
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 4)
    .map((item) => ({
      id: item.id,
      value: item.value,
      title: item.title,
      subtitle: item.subtitle,
      href: item.href,
    }));

  const items = [
    ...(atletas.data ?? []).map((row) => ({
      id: `atleta-${row.id}`,
      value: String(row.nome ?? row.username ?? ""),
      title: row.nome ?? row.username ?? "Atleta",
      subtitle: row.username ? `@${row.username}` : "Atleta",
      href: `/perfil/${row.id}?from=/buscar`,
    })),
    ...localItems,
    ...(times.data ?? []).map((row) => ({
      id: `time-${row.id}`,
      value: String(row.nome ?? ""),
      title: row.nome ?? "Time",
      subtitle: row.localizacao ?? "Sem localização",
      href: `/perfil-time/${row.id}?from=/buscar`,
    })),
    ...(torneios.data ?? []).map((row) => ({
      id: `torneio-${row.id}`,
      value: String(row.nome ?? ""),
      title: row.nome ?? "Torneio",
      subtitle: row.status ? `Status: ${row.status}` : "Torneio",
      href: `/torneios/${row.id}?from=/buscar`,
    })),
  ].slice(0, 10);

  return NextResponse.json({ ok: true, items });
}
