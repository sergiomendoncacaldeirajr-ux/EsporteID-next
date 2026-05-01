import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/server";

export const preferredRegion = ["gru1"];

/** Invalida o cache da rota /comunidade antes de `router.refresh()` no cliente (Next 16 / RSC). */
export async function POST() {
  try {
    const supabase = await createRouteHandlerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });

    revalidatePath("/comunidade");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
