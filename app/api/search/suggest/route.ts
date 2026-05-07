import { NextResponse } from "next/server";
import { distanciaKm } from "@/lib/geo/distance-km";
import { createRouteHandlerClient } from "@/lib/supabase/server";

type Scope = "global" | "times" | "torneios" | "locais" | "atletas" | "admin_push_usuarios";

type AtletaRow = { id: string; nome: string | null; username: string | null };
type LocalRow = {
  id: number;
  slug: string | null;
  nome_publico: string | null;
  localizacao: string | null;
  lat: string | null;
  lng: string | null;
};
type TimeRow = { id: number; nome: string | null; localizacao: string | null };
type TorneioRow = { id: number; nome: string | null; status: string | null };

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

  if (scope === "admin_push_usuarios") {
    const { data: adminRow } = await supabase.from("platform_admins").select("user_id").eq("user_id", user.id).maybeSingle();
    if (!adminRow) return NextResponse.json({ ok: false, items: [] }, { status: 403 });
    const { data, error } = await supabase.rpc("api_fold_search_profiles_admin", {
      p_search: q,
      p_exclude_user: null,
      p_limit: 15,
    });
    if (error) {
      console.error("[search/suggest] admin_push_usuarios api_fold_search_profiles_admin", error);
      return NextResponse.json({ ok: true, items: [] });
    }
    const rows = (data ?? []) as AtletaRow[];
    return NextResponse.json({
      ok: true,
      items: rows.map((row) => ({
        id: String(row.id),
        value: String(row.id),
        title: row.nome?.trim() || row.username || "Atleta",
        subtitle: row.username ? `@${row.username}` : null,
      })),
    });
  }

  if (scope === "atletas") {
    const { data, error } = await supabase.rpc("api_fold_search_atletas", {
      p_search: q,
      p_exclude_user: user.id,
      p_limit: 12,
    });
    if (error) {
      console.error("[search/suggest] api_fold_search_atletas", error);
      return NextResponse.json({ ok: true, items: [] });
    }
    const rows = (data ?? []) as AtletaRow[];
    return NextResponse.json({
      ok: true,
      items: rows.map((row) => ({
        id: String(row.id),
        value: String(row.username ?? "").trim(),
        title: row.nome?.trim() || row.username || "Atleta",
        subtitle: row.username ? `@${row.username}` : null,
      })),
    });
  }

  const { data: me } = await supabase.from("profiles").select("lat, lng").eq("id", user.id).maybeSingle();
  const myLat = Number(me?.lat ?? NaN);
  const myLng = Number(me?.lng ?? NaN);
  const hasCoords = Number.isFinite(myLat) && Number.isFinite(myLng);

  if (scope === "times") {
    const { data, error } = await supabase.rpc("api_fold_search_times_suggest", {
      p_search: q,
      p_limit: 8,
    });
    if (error) {
      console.error("[search/suggest] api_fold_search_times_suggest", error);
      return NextResponse.json({ ok: true, items: [] });
    }
    const rows = (data ?? []) as TimeRow[];
    return NextResponse.json({
      ok: true,
      items: rows.map((row) => ({
        id: `time-${row.id}`,
        value: String(row.nome ?? ""),
        title: row.nome ?? "Time",
        subtitle: row.localizacao ?? "Sem localização",
        href: `/perfil-time/${row.id}?from=/times`,
      })),
    });
  }

  if (scope === "torneios") {
    const { data, error } = await supabase.rpc("api_fold_search_torneios_suggest", {
      p_search: q,
      p_limit: 8,
    });
    if (error) {
      console.error("[search/suggest] api_fold_search_torneios_suggest", error);
      return NextResponse.json({ ok: true, items: [] });
    }
    const rows = (data ?? []) as TorneioRow[];
    return NextResponse.json({
      ok: true,
      items: rows.map((row) => ({
        id: `torneio-${row.id}`,
        value: String(row.nome ?? ""),
        title: row.nome ?? "Torneio",
        subtitle: row.status ? `Status: ${row.status}` : null,
        href: `/torneios/${row.id}?from=/torneios`,
      })),
    });
  }

  if (scope === "locais") {
    const { data, error } = await supabase.rpc("api_fold_search_espacos_listagem", {
      p_search: q,
      p_limit: 30,
    });
    if (error) {
      console.error("[search/suggest] api_fold_search_espacos_listagem", error);
      return NextResponse.json({ ok: true, items: [] });
    }
    const rows = (data ?? []) as LocalRow[];
    const items = rows
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
    // Busca todos os perfis cadastrados (não só atletas) para a pesquisa geral da plataforma.
    // api_fold_search_atletas só retorna usuários com papel 'atleta', o que excluía donos de espaço,
    // professores e organizadores. api_fold_search_profiles_admin busca pelo nome em todos os perfis.
    supabase.rpc("api_fold_search_profiles_admin", {
      p_search: q,
      p_exclude_user: null,
      p_limit: 6,
    }),
    supabase.rpc("api_fold_search_espacos_listagem", {
      p_search: q,
      p_limit: 16,
    }),
    supabase.rpc("api_fold_search_times_suggest", {
      p_search: q,
      p_limit: 6,
    }),
    supabase.rpc("api_fold_search_torneios_suggest", {
      p_search: q,
      p_limit: 6,
    }),
  ]);

  if (atletas.error) console.error("[search/suggest] global atletas", atletas.error);
  if (locais.error) console.error("[search/suggest] global locais", locais.error);
  if (times.error) console.error("[search/suggest] global times", times.error);
  if (torneios.error) console.error("[search/suggest] global torneios", torneios.error);

  const atletaRowsRaw = (atletas.data ?? []) as AtletaRow[];
  const localRows = (locais.data ?? []) as LocalRow[];
  const timeRows = (times.data ?? []) as TimeRow[];
  const torneioRows = (torneios.data ?? []) as TorneioRow[];

  // Busca tipo_usuario para filtrar perfis sem página pública (pendente/espaco)
  // e rotear professores/organizadores para as rotas corretas.
  const profileIds = atletaRowsRaw.map((r) => r.id);
  const tipoMap = new Map<string, string | null>();
  if (profileIds.length) {
    const { data: tipoRows } = await supabase
      .from("profiles")
      .select("id, tipo_usuario")
      .in("id", profileIds);
    for (const r of tipoRows ?? []) tipoMap.set(r.id, r.tipo_usuario);
  }
  // Exclui perfis pendentes (sem página pública) e donos de espaço
  // (esses já aparecem na seção de locais da busca).
  const atletaRows = atletaRowsRaw.filter((r) => {
    const tipo = tipoMap.get(r.id);
    return tipo && tipo !== "pendente" && tipo !== "espaco";
  });

  const localItems = localRows
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
    ...atletaRows.map((row) => {
      const tipo = tipoMap.get(row.id);
      const href =
        tipo === "professor" ? `/professor/${row.id}?from=/buscar`
        : tipo === "organizador" ? `/organizador/${row.id}?from=/buscar`
        : `/perfil/${row.id}?from=/buscar`;
      const roleLabel =
        tipo === "professor" ? "Professor"
        : tipo === "organizador" ? "Organizador"
        : "Atleta";
      return {
        id: `atleta-${row.id}`,
        value: String(row.nome ?? row.username ?? ""),
        title: row.nome ?? row.username ?? roleLabel,
        subtitle: row.username ? `@${row.username}` : roleLabel,
        href,
      };
    }),
    ...localItems,
    ...timeRows.map((row) => ({
      id: `time-${row.id}`,
      value: String(row.nome ?? ""),
      title: row.nome ?? "Time",
      subtitle: row.localizacao ?? "Sem localização",
      href: `/perfil-time/${row.id}?from=/buscar`,
    })),
    ...torneioRows.map((row) => ({
      id: `torneio-${row.id}`,
      value: String(row.nome ?? ""),
      title: row.nome ?? "Torneio",
      subtitle: row.status ? `Status: ${row.status}` : "Torneio",
      href: `/torneios/${row.id}?from=/buscar`,
    })),
  ].slice(0, 10);

  return NextResponse.json({ ok: true, items });
}
