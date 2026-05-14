import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/server";
import { createServiceRoleClient, hasServiceRoleConfig } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

function cleanText(value: unknown, max = 240) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function cleanPath(value: unknown) {
  const path = cleanText(value, 320);
  if (!path || !path.startsWith("/")) return "/";
  return path;
}

function clampActiveSeconds(value: unknown) {
  const n = Math.trunc(Number(value ?? 0));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, 120);
}

export async function POST(req: Request) {
  if (!hasServiceRoleConfig()) {
    return NextResponse.json({ ok: false, reason: "service_role_missing" }, { status: 200 });
  }

  const supabase = await createRouteHandlerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const path = cleanPath(body.path);
  const title = cleanText(body.title, 180) || null;
  const activeSeconds = clampActiveSeconds(body.activeSeconds);
  const userAgent = cleanText(req.headers.get("user-agent"), 420) || null;
  const db = createServiceRoleClient();

  const { data: profile } = await db
    .from("profiles")
    .select("localizacao")
    .eq("id", user.id)
    .maybeSingle();
  const localizacao = cleanText((profile as { localizacao?: string | null } | null)?.localizacao, 160) || null;

  const { data: current } = await db
    .from("admin_user_activity")
    .select("total_active_seconds, heartbeat_count, first_seen_at")
    .eq("user_id", user.id)
    .maybeSingle();

  const totalActive = Math.max(0, Number((current as { total_active_seconds?: number | null } | null)?.total_active_seconds ?? 0)) + activeSeconds;
  const heartbeatCount = Math.max(0, Number((current as { heartbeat_count?: number | null } | null)?.heartbeat_count ?? 0)) + 1;
  const nowIso = new Date().toISOString();

  const { error: activityError } = await db.from("admin_user_activity").upsert(
    {
      user_id: user.id,
      first_seen_at: (current as { first_seen_at?: string | null } | null)?.first_seen_at ?? nowIso,
      last_seen_at: nowIso,
      last_path: path,
      last_title: title,
      last_user_agent: userAgent,
      localizacao,
      total_active_seconds: totalActive,
      heartbeat_count: heartbeatCount,
      updated_at: nowIso,
    },
    { onConflict: "user_id" },
  );

  const { data: pageCurrent } = await db
    .from("admin_user_page_activity")
    .select("total_active_seconds, view_count, first_seen_at")
    .eq("user_id", user.id)
    .eq("path", path)
    .maybeSingle();
  const pageTotal = Math.max(0, Number((pageCurrent as { total_active_seconds?: number | null } | null)?.total_active_seconds ?? 0)) + activeSeconds;
  const pageViews = Math.max(0, Number((pageCurrent as { view_count?: number | null } | null)?.view_count ?? 0)) + 1;

  const { error: pageError } = await db.from("admin_user_page_activity").upsert(
    {
      user_id: user.id,
      path,
      title,
      first_seen_at: (pageCurrent as { first_seen_at?: string | null } | null)?.first_seen_at ?? nowIso,
      last_seen_at: nowIso,
      total_active_seconds: pageTotal,
      view_count: pageViews,
      updated_at: nowIso,
    },
    { onConflict: "user_id,path" },
  );

  if (activityError || pageError) {
    return NextResponse.json({ ok: false, reason: activityError?.message ?? pageError?.message }, { status: 200 });
  }

  return NextResponse.json({ ok: true });
}
