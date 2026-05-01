import { NextResponse } from "next/server";
import { assertCronSecret } from "@/lib/internal/cron-auth";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const preferredRegion = ["gru1"];

async function run(request: Request) {
  try {
    assertCronSecret(request);
    const admin = createServiceRoleClient();
    const { data, error } = await admin.rpc("professor_abrir_feedbacks_mensal");
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, created: data ?? 0 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao abrir feedback mensal." },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
