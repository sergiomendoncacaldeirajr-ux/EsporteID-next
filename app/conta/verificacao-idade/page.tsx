import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VerificacaoIdadeForm } from "@/components/conta/verificacao-idade-form";

const NEED_GATE = new Set(["pendente_documento", "em_analise", "reprovado"]);

export const metadata = {
  title: "Verificação de idade",
  description: "Envio de documento e selfie para liberar o match.",
};

export default async function VerificacaoIdadePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/conta/verificacao-idade");

  const { data: profile } = await supabase
    .from("profiles")
    .select("nome, match_idade_gate")
    .eq("id", user.id)
    .maybeSingle();

  const gate = String(profile?.match_idade_gate ?? "ok");
  const precisa = NEED_GATE.has(gate);

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-xl font-bold text-eid-fg">Verificação de idade</h1>
      <p className="mt-2 text-sm text-eid-text-secondary">
        Quando há denúncia de menor de idade ou política da plataforma exige, você precisa enviar uma foto legível de um documento
        oficial com foto (RG, CNH, etc.) e uma selfie para comparação automática de rosto.
      </p>

      {!precisa ? (
        <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
          Sua conta não exige verificação no momento.
          <Link href="/dashboard" className="mt-3 block font-semibold text-eid-action-400 underline">
            Voltar ao painel
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-4 text-xs text-amber-200/90">
            Status atual: <span className="font-mono">{gate}</span>. Enquanto não for aprovado, você não pode usar match (pedidos e
            aceites).
          </p>
          <VerificacaoIdadeForm nome={profile?.nome ?? "Atleta"} />
        </>
      )}
    </div>
  );
}
