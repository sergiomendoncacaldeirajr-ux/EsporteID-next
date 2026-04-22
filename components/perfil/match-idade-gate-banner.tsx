import Link from "next/link";

/** Banner quando o próprio usuário está com verificação de idade pendente (match bloqueado). */
export function MatchIdadeGateBanner({ gate }: { gate: string }) {
  if (gate === "ok" || gate === "aprovado") return null;

  const copy: Record<string, { title: string; body: string }> = {
    pendente_documento: {
      title: "Verificação de idade necessária",
      body: "Há uma pendência na sua conta. Envie documento oficial com foto e uma selfie para liberar pedidos e aceites de match.",
    },
    em_analise: {
      title: "Verificação em processamento",
      body: "Recebemos seus arquivos. Aguarde o processamento automático ou tente novamente se a página orientar.",
    },
    reprovado: {
      title: "Verificação não aprovada",
      body: "A checagem automática não confirmou correspondência entre documento e selfie. Você pode tentar novamente com imagens mais nítidas ou aguardar contato da moderação.",
    },
  };

  const c = copy[gate] ?? {
    title: "Status de verificação",
    body: "Sua conta pode ter restrições no match até concluir a verificação.",
  };

  return (
    <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-3 text-sm text-amber-50">
      <p className="font-bold text-amber-100">{c.title}</p>
      <p className="mt-1 text-xs leading-snug text-amber-100/90">{c.body}</p>
      <Link
        href="/conta/verificacao-idade"
        className="mt-2 inline-flex text-xs font-bold uppercase tracking-wide text-eid-action-400 underline"
      >
        Abrir verificação
      </Link>
    </div>
  );
}
