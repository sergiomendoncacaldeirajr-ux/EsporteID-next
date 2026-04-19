import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { solicitarCopiaDados, solicitarExclusaoConta } from "./actions";

export const metadata = {
  title: "Seus dados · EsporteID",
  description: "Direitos do titular conforme LGPD",
};

type Props = {
  searchParams?: Promise<{ ok?: string; erro?: string }>;
};

export default async function DadosLgpdPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "lgpd_export_requested_at, lgpd_delete_requested_at, nome, dpo_email_contato"
    )
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-2xl flex-1 px-4 py-12">
      {sp.ok === "copia" ? (
        <p className="mb-6 rounded-xl border border-eid-primary-500/30 bg-eid-primary-500/10 px-3 py-2 text-sm text-eid-primary-300">
          Pedido de cópia registrado. Entraremos em contato pelo e-mail da conta se
          necessário.
        </p>
      ) : null}
      {sp.ok === "exclusao" ? (
        <p className="mb-6 rounded-xl border border-eid-action-500/35 bg-eid-action-500/10 px-3 py-2 text-sm text-eid-action-400">
          Pedido de exclusão registrado. A equipe analisará prazos legais e
          retorno.
        </p>
      ) : null}
      {sp.erro ? (
        <p className="mb-6 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {decodeURIComponent(sp.erro)}
        </p>
      ) : null}
      <h1 className="text-2xl font-semibold text-eid-fg">Seus dados pessoais (LGPD)</h1>
      <p className="mt-3 text-sm leading-relaxed text-eid-text-secondary">
        Você pode exercer os direitos previstos no art. 18 da Lei 13.709/2018,
        incluindo confirmação de tratamento, acesso, correção, anonimização,
        portabilidade e eliminação dos dados, conforme aplicável.
      </p>

      <section className="eid-card mt-10 space-y-4">
        <h2 className="font-medium text-eid-fg">Pedido de cópia dos dados (portabilidade / acesso)</h2>
        <p className="text-sm text-eid-text-secondary">
          Registraremos seu pedido. A equipe pode entrar em contato pelo e-mail
          da conta para envio ou esclarecimentos, no prazo razoável previsto na
          legislação.
        </p>
        {profile?.lgpd_export_requested_at ? (
          <p className="text-sm text-eid-primary-300">
            Pedido registrado em:{" "}
            {new Date(profile.lgpd_export_requested_at).toLocaleString("pt-BR")}
          </p>
        ) : (
          <form action={solicitarCopiaDados}>
            <button
              type="submit"
              className="eid-btn-primary rounded-xl text-sm"
            >
              Solicitar cópia dos meus dados
            </button>
          </form>
        )}
      </section>

      <section className="mt-8 space-y-4 rounded-2xl border border-red-500/35 bg-red-950/25 p-6">
        <h2 className="font-medium text-red-100">Exclusão de conta e dados</h2>
        <p className="text-sm text-red-200/90">
          O pedido de exclusão pode ser limitado por obrigações legais ou
          contratuais (ex.: registros fiscais). Após análise, a conta poderá ser
          encerrada e dados anonimizados ou apagados quando possível.
        </p>
        {profile?.lgpd_delete_requested_at ? (
          <p className="text-sm text-red-300">
            Pedido registrado em:{" "}
            {new Date(profile.lgpd_delete_requested_at).toLocaleString("pt-BR")}
          </p>
        ) : (
          <form action={solicitarExclusaoConta}>
            <button
              type="submit"
              className="rounded-xl bg-red-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-600 active:scale-[0.99]"
            >
              Solicitar exclusão da minha conta
            </button>
          </form>
        )}
      </section>

      <p className="mt-8 text-sm text-eid-text-secondary">
        Dúvidas: consulte a{" "}
        <Link href="/privacidade" className="text-eid-primary-300 underline hover:text-eid-fg">
          Política de Privacidade
        </Link>{" "}
        ou o canal de suporte quando estiver disponível no produto.
      </p>
    </div>
  );
}
