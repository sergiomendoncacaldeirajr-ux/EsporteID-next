import Link from "next/link";
import { redirect } from "next/navigation";
import { ConfirmarMaioridadeMatchForm } from "@/components/conta/confirmar-maioridade-match-form";
import { safeNextInternalPath } from "@/lib/match/redirect-maioridade-match";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Confirmação etária — Desafio",
  description: "Confirme que tem 18 anos ou mais para usar o sistema de desafios.",
};

type Props = { searchParams?: Promise<{ next?: string }> };

export default async function ConfirmarMaioridadeMatchPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const next = safeNextInternalPath(sp.next);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/conta/confirmar-maioridade-match?next=${encodeURIComponent(next)}`)}`);

  const { data: prof } = await supabase
    .from("profiles")
    .select("match_maioridade_confirmada, nome")
    .eq("id", user.id)
    .maybeSingle();

  if (prof?.match_maioridade_confirmada) {
    redirect(next);
  }

  return (
    <div data-eid-desafio-ui className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-xl font-bold text-eid-fg">Uso do Desafio — maioridade</h1>
      <p className="mt-3 text-sm leading-relaxed text-eid-text-secondary">
        A função <strong className="text-eid-fg">Desafio</strong> é destinada exclusivamente a pessoas{" "}
        <strong className="text-eid-fg">maiores de 18 anos</strong>, conforme os Termos de Uso e a legislação aplicável à proteção de
        crianças e adolescentes.
      </p>
      <p className="mt-2 text-sm leading-relaxed text-eid-text-secondary">
        Confirme sua idade abaixo. Os dados serão registrados com data, horário, endereço de rede (IP), idioma do navegador e demais
        informações técnicas necessárias à comprovação e auditoria (incluindo obrigações da LGPD).
      </p>
      <p className="mt-2 text-xs text-eid-text-secondary">
        Dúvidas?{" "}
        <Link href="/termos" className="font-semibold text-eid-primary-300 underline">
          Termos de uso
        </Link>
        .
      </p>

      <ConfirmarMaioridadeMatchForm nextPath={next} nome={prof?.nome ?? "Atleta"} />
    </div>
  );
}
