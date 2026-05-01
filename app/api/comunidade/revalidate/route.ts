import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/server";
import { revalidateAppPath } from "@/lib/realtime/revalidate-app-path";

export const preferredRegion = ["gru1"];

/** Compat: mesmo efeito de `POST /api/realtime/revalidate-current` com path fixo. */
export async function POST() {
  try {
    const supabase = await createRouteHandlerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });

    revalidateAppPath("/comunidade");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
