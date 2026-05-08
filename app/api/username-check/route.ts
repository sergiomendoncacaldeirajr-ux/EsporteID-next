import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/server";

type AllowedTable = "profiles" | "times" | "duplas";
const ALLOWED_TABLES: AllowedTable[] = ["profiles", "times", "duplas"];

export async function GET(request: Request) {
  const supabase = await createRouteHandlerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ available: false }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const username = String(searchParams.get("username") ?? "")
    .toLowerCase()
    .trim();
  const table = String(searchParams.get("table") ?? "profiles") as AllowedTable;
  const excludeId = searchParams.get("excludeId") ?? null;

  if (!ALLOWED_TABLES.includes(table)) {
    return NextResponse.json({ available: false }, { status: 400 });
  }

  if (!/^[a-z0-9_]{3,24}$/.test(username)) {
    return NextResponse.json({ available: false, invalid: true });
  }

  let query = supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("username", username);

  if (excludeId) {
    if (table === "profiles") {
      // profiles use UUID strings
      query = query.neq("id", excludeId);
    } else {
      // times and duplas use numeric IDs
      const numId = Number(excludeId);
      if (Number.isFinite(numId) && numId > 0) {
        query = query.neq("id", numId);
      }
    }
  }

  const { count, error } = await query;

  if (error) {
    console.error("[username-check]", error);
    return NextResponse.json({ available: false }, { status: 500 });
  }

  return NextResponse.json({ available: count === 0 });
}
