import { NextResponse } from "next/server";
import { assertCronSecret } from "@/lib/internal/cron-auth";
import { dispatchPendingPushNotifications } from "@/lib/pwa/push-dispatch";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

async function run(request: Request) {
  try {
    assertCronSecret(request);
    const admin = createServiceRoleClient();
    const result = await dispatchPendingPushNotifications(admin, { batchSize: 200 });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha no job de push." },
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

