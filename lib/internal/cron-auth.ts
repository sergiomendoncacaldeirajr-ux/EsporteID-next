export function assertCronSecret(request: Request) {
  const expected = process.env.CRON_SECRET?.trim();
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
