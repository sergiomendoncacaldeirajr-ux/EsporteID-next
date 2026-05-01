import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/server";
import { normalizeRevalidateAppPath } from "@/lib/realtime/revalidate-app-path";
import { revalidatePath } from "next/cache";

export const preferredRegion = ["gru1"];

/**
 * Invalida o cache RSC da rota atual antes de `router.refresh()` no cliente.
 * Usado pelo bridge global (`RealtimePageRefresh`); autenticação obrigatória.
 */
export async function POST(req: Request) {
  try {
    const supabase = await createRouteHandlerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });

    let rawPath = "/";
    try {
      const body = (await req.json()) as { path?: unknown };
      if (typeof body?.path === "string" && body.path.trim()) rawPath = body.path.trim();
    } catch {
      rawPath = "/";
    }

    const path = normalizeRevalidateAppPath(rawPath);
    revalidatePath(path);
    return NextResponse.json({ ok: true, path });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
