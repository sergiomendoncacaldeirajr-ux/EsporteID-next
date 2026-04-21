import { NextResponse } from "next/server";
import {
  ACTIVE_CONTEXT_COOKIE,
  getContextHomeHref,
  resolveActiveAppContext,
} from "@/lib/auth/active-context";
import { listarPapeis } from "@/lib/roles";
import { createRouteHandlerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createRouteHandlerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, message: "Sessão expirada." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { context?: string };
  const { data: papeisRows } = await supabase.from("usuario_papeis").select("papel").eq("usuario_id", user.id);
  const papeis = listarPapeis(papeisRows);
  const context = resolveActiveAppContext(body.context, papeis);

  const response = NextResponse.json({
    ok: true,
    context,
    redirectTo: getContextHomeHref(context),
  });

  response.cookies.set({
    name: ACTIVE_CONTEXT_COOKIE,
    value: context,
    path: "/",
    sameSite: "lax",
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
