"use client";

/**
 * Fallback global quando o root layout falha (evita corpo 500 vazio em produção).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isConfig =
    /NEXT_PUBLIC_SUPABASE|SUPABASE_CONFIG|EID_SUPABASE/i.test(error.message) ||
    /supabase/i.test(error.message);

  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: "system-ui", padding: "2rem", maxWidth: 520 }}>
        <h1 style={{ fontSize: "1.25rem" }}>EsporteID — erro ao carregar</h1>
        <p style={{ color: "#444", lineHeight: 1.5 }}>
          {isConfig
            ? "Configuração do servidor incompleta (variáveis do Supabase ou deploy). Verifique o painel Cloudflare Pages → Environment variables (Production e Preview)."
            : "Ocorreu um erro inesperado. Tente novamente ou volte mais tarde."}
        </p>
        {process.env.NODE_ENV === "development" ? (
          <pre style={{ fontSize: 12, overflow: "auto", background: "#f5f5f5", padding: 12 }}>
            {error.message}
            {error.digest ? `\ndigest: ${error.digest}` : ""}
          </pre>
        ) : null}
        <button
          type="button"
          onClick={() => reset()}
          style={{ marginTop: 16, padding: "8px 16px", cursor: "pointer" }}
        >
          Tentar de novo
        </button>
      </body>
    </html>
  );
}
