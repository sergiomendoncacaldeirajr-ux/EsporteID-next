import { redirect } from "next/navigation";
import { getEspacoSelecionado } from "@/lib/espacos/server";
import { getPaaSUnidadeGateInfo } from "@/lib/espacos/paas-unidades-gate";
import { EspacoOnboardingWizard } from "@/components/espaco/onboarding/espaco-onboarding-wizard";

export default async function EspacoOnboardingPage() {
  const { supabase, user, selectedSpace } = await getEspacoSelecionado({
    nextPath: "/espaco/onboarding",
  });

  if (
    selectedSpace.operacao_status &&
    selectedSpace.operacao_status !== "rascunho"
  ) {
    redirect("/espaco");
  }

  const [
    { data: esportes },
    { data: unidades },
    { data: horarios },
    { data: feriados },
    { data: planos },
    { data: parceiro },
    { data: planosPaaS },
    unidadeGate,
  ] = await Promise.all([
    supabase.from("esportes").select("id, nome").order("nome"),
    supabase
      .from("espaco_unidades")
      .select("id, nome, tipo_unidade, superficie, coberta, indoor, iluminacao, aceita_aulas, aceita_torneios, logo_arquivo, ativo")
      .eq("espaco_generico_id", selectedSpace.id)
      .eq("ativo", true)
      .order("id"),
    supabase
      .from("espaco_horarios_semanais")
      .select("id, dia_semana, hora_inicio, hora_fim")
      .eq("espaco_generico_id", selectedSpace.id)
      .is("espaco_unidade_id", null)
      .eq("ativo", true)
      .order("dia_semana"),
    supabase
      .from("espaco_feriados_personalizados")
      .select("id, nome, data_inicio, data_fim, operar_no_feriado, recorrente_anual")
      .eq("espaco_generico_id", selectedSpace.id)
      .gte("data_fim", new Date().toISOString().slice(0, 10))
      .order("data_inicio")
      .limit(30),
    supabase
      .from("espaco_planos_socio")
      .select("id, nome, mensalidade_centavos, ativo")
      .eq("espaco_generico_id", selectedSpace.id)
      .eq("ativo", true)
      .order("ordem"),
    supabase
      .from("parceiro_conta_asaas")
      .select("nome_razao_social, cpf_cnpj, email, onboarding_status")
      .eq("usuario_id", user.id)
      .maybeSingle(),
    selectedSpace.modo_monetizacao === "mensalidade_plataforma"
      ? supabase
          .from("espaco_plano_mensal_plataforma")
          .select("id, nome, min_unidades, max_unidades, valor_mensal_centavos, socios_mensal_modo")
          .is("espaco_generico_id", null)
          .eq("categoria_espaco", selectedSpace.categoria_mensalidade ?? "outro")
          .eq("ativo", true)
          .eq("liberacao", "publico")
          .order("ordem", { ascending: true })
      : Promise.resolve({ data: [] as never[] }),
    getPaaSUnidadeGateInfo(supabase, selectedSpace.id),
  ]);

  return (
    <EspacoOnboardingWizard
      space={{
        id: selectedSpace.id,
        nome_publico: selectedSpace.nome_publico,
        slug: selectedSpace.slug,
        categoria_mensalidade: selectedSpace.categoria_mensalidade,
        modo_reserva: selectedSpace.modo_reserva,
        aceita_socios: selectedSpace.aceita_socios,
        cidade: selectedSpace.cidade,
        uf: selectedSpace.uf,
        descricao_curta: selectedSpace.descricao_curta,
        descricao_longa: selectedSpace.descricao_longa,
        whatsapp_contato: selectedSpace.whatsapp_contato,
        email_contato: selectedSpace.email_contato,
        website_url: selectedSpace.website_url,
        instagram_url: selectedSpace.instagram_url,
      }}
      esportes={(esportes ?? []) as Array<{ id: number; nome: string }>}
      unidades={(unidades ?? []) as Array<{
        id: number; nome: string; tipo_unidade: string;
        superficie: string | null; coberta: boolean; indoor: boolean;
        iluminacao: boolean; aceita_aulas: boolean; aceita_torneios: boolean;
        logo_arquivo: string | null;
      }>}
      unidadeGate={unidadeGate}
      planosPaaS={(planosPaaS ?? []) as Array<{
        id: number;
        nome: string;
        min_unidades: number;
        max_unidades: number | null;
        valor_mensal_centavos: number;
        socios_mensal_modo: string | null;
      }>}
      horarios={(horarios ?? []) as Array<{
        id: number; dia_semana: number; hora_inicio: string; hora_fim: string;
      }>}
      feriados={(feriados ?? []) as Array<{
        id: number; nome: string | null; data_inicio: string; data_fim: string;
        operar_no_feriado: boolean; recorrente_anual: boolean | null;
      }>}
      planos={(planos ?? []) as Array<{
        id: number; nome: string; mensalidade_centavos: number;
      }>}
      parceiro={(parceiro as {
        nome_razao_social: string | null;
        cpf_cnpj: string | null;
        email: string | null;
        onboarding_status: string | null;
      } | null) ?? null}
    />
  );
}
