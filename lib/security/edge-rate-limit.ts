import { NextResponse, type NextRequest } from "next/server";

type Bucket = { count: number; resetAt: number };

const WINDOW_MS = 60_000;
const MAX_KEYS = 8_000;
const buckets = new Map<string, Bucket>();

function prune(now: number) {
  if (buckets.size < MAX_KEYS) return;
  for (const [k, v] of buckets.entries()) {
    if (now > v.resetAt + WINDOW_MS) buckets.delete(k);
  }
}

/** IP do cliente (Vercel / proxies). */
export function getClientIp(request: NextRequest): string {
  const xf = request.headers.get("x-forwarded-for");
  if (xf) {
    const first = xf.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real;
  return "unknown";
}

/**
 * Rate limit simples no Edge (memória do isolate). Mitiga abuso em massa;
 * em produção multi-região use Vercel Firewall, Upstash Redis ou WAF para limites globais.
 * Desligar: EDGE_RATE_LIMIT=0
 */
export function checkEdgeRateLimitResponse(
  key: string,
  ip: string,
  maxPerWindow: number
): NextResponse | null {
  if (process.env.EDGE_RATE_LIMIT === "0") return null;
  const now = Date.now();
  prune(now);
  const mapKey = `${key}:${ip}`;
  let b = buckets.get(mapKey);
  if (!b || now > b.resetAt) {
    b = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(mapKey, b);
  }
  if (b.count >= maxPerWindow) {
    return NextResponse.json(
      { error: "Muitas requisições. Aguarde um minuto e tente novamente." },
      {
        status: 429,
        headers: {
          "Retry-After": "60",
          "Cache-Control": "no-store",
        },
      }
    );
  }
  b.count += 1;
  return null;
}

/** Limites por tipo de rota (requisições por minuto / IP). */
export function rateLimitForRequest(request: NextRequest): NextResponse | null {
  const path = request.nextUrl.pathname;
  const ip = getClientIp(request);

  if (path.startsWith("/api/jobs/")) {
    return checkEdgeRateLimitResponse("api-jobs", ip, 45);
  }
  if (path.startsWith("/api/")) {
    return checkEdgeRateLimitResponse("api", ip, 150);
  }
  if (path === "/login" || path.startsWith("/login/")) {
    return checkEdgeRateLimitResponse("login", ip, 80);
  }
  if (path.startsWith("/auth/callback")) {
    return checkEdgeRateLimitResponse("auth-callback", ip, 50);
  }
  return null;
}
