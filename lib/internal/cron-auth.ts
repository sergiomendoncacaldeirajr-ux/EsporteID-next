export function assertCronSecret(request: Request) {
  const expected = process.env.CRON_SECRET?.trim();
  const vercelCronHeader = request.headers.get("x-vercel-cron")?.trim();
  if (vercelCronHeader === "1") return;
  if (!expected) {
    throw new Error("CRON_SECRET ausente.");
  }

  const provided =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ||
    request.headers.get("x-cron-secret")?.trim() ||
    "";

  if (!provided || provided !== expected) {
    throw new Error("Acesso negado.");
  }
}
