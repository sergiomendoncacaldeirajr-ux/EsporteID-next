import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type Papel = "professor" | "organizador";

export async function GET(request: Request) {
  const supabase = await createRouteHandlerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, items: [] }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = String(searchParams.get("q") ?? "").trim();
  const papel = String(searchParams.get("papel") ?? "professor") as Papel;
  const espacoId = Number(searchParams.get("espaco_id") ?? 0);

  if (!espacoId) return NextResponse.json({ ok: false, items: [] }, { status: 400 });
  if (papel !== "professor" && papel !== "organizador") {
    return NextResponse.json({ ok: false, items: [] }, { status: 400 });
  }
  if (q.length < 3) return NextResponse.json({ ok: true, items: [] });

  const admin = createServiceRoleClient();
  const { data: espaco, error: espacoErr } = await admin
    .from("espacos_genericos")
    .select("id, responsavel_usuario_id, criado_por_usuario_id")
    .eq("id", espacoId)
    .maybeSingle();
  if (espacoErr) return NextResponse.json({ ok: false, items: [] }, { status: 500 });
  const canManage = espaco && (espaco.responsavel_usuario_id === user.id || espaco.criado_por_usuario_id === user.id);
  if (!canManage) return NextResponse.json({ ok: false, items: [] }, { status: 403 });

  const like = `%${q.replace(/[%_]/g, "")}%`;
  const { data: profiles, error: profilesErr } = await admin
    .from("profiles")
    .select("id, nome, username, avatar_url, tipo_usuario")
    .or(`nome.ilike.${like},username.ilike.${like}`)
    .limit(12);
  if (profilesErr) {
    console.error("[espaco/operadores-suggest] profiles", profilesErr);
    return NextResponse.json({ ok: true, items: [] });
  }

  const ids = (profiles ?? []).map((profile) => String(profile.id));
  if (!ids.length) return NextResponse.json({ ok: true, items: [] });

  const { data: roles, error: rolesErr } = await admin
    .from("usuario_papeis")
    .select("usuario_id, papel")
    .in("usuario_id", ids)
    .eq("papel", papel);
  if (rolesErr) {
    console.error("[espaco/operadores-suggest] roles", rolesErr);
    return NextResponse.json({ ok: true, items: [] });
  }

  const allowed = new Set((roles ?? []).map((role) => String(role.usuario_id)));
  const items = (profiles ?? [])
    .filter((profile) => allowed.has(String(profile.id)))
    .slice(0, 8)
    .map((profile) => ({
      id: String(profile.id),
      value: String(profile.id),
      title: profile.nome?.trim() || profile.username || (papel === "professor" ? "Professor" : "Organizador"),
      subtitle: profile.username ? `@${profile.username}` : papel === "professor" ? "Professor" : "Organizador",
      avatarUrl: profile.avatar_url ?? null,
    }));

  return NextResponse.json({ ok: true, items });
}
