import { redirect } from "next/navigation";
import {
  getEspacoSelecionado,
  getLogoCadastradoNoOnboardingDeLocais,
  resolveEspacoPublicAssetUrl,
} from "@/lib/espacos/server";
import { getPaaSUnidadeGateInfo } from "@/lib/espacos/paas-unidades-gate";
import { EspacoOnboardingWizard } from "@/components/espaco/onboarding/espaco-onboarding-wizard";
import { normalizeEspacoReservaConfig } from "@/lib/espacos/config";

function parseJsonRecord(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
    } catch {
      return {};
    }
  }
  return typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
}

function parseEsportesIds(raw: unknown): number[] {
  let value = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw || "[]");
    } catch {
      value = [];
    }
  }
  return Array.isArray(value)
    ? value.map((item) => Number(item)).filter((item) => Number.isFinite(item) && item > 0)
    : [];
}

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

  const deveCarregarPlanosPaaS =
    selectedSpace.modo_monetizacao === "mensalidade_plataforma" ||
    selectedSpace.modo_reserva !== "paga";

  const [
    { data: esportes },
    { data: locaisExistentes },
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
      .from("espacos_genericos")
      .select("id, slug, nome_publico, localizacao, logo_arquivo, cidade, uf, venue_config_json")
      .neq("id", selectedSpace.id)
      .order("nome_publico")
      .limit(500),
    supabase
      .from("espaco_unidades")
      .select("id, nome, tipo_unidade, superficie, esporte_id, modalidade, coberta, indoor, iluminacao, aceita_aulas, aceita_torneios, observacoes, logo_arquivo, modo_reserva, intervalo_minutos, configuracao_agenda_json, ativo")
      .eq("espaco_generico_id", selectedSpace.id)
      .eq("ativo", true)
      .order("id"),
    supabase
      .from("espaco_horarios_semanais")
      .select("id, espaco_unidade_id, dia_semana, hora_inicio, hora_fim, observacoes")
      .eq("espaco_generico_id", selectedSpace.id)
      .eq("ativo", true)
      .order("espaco_unidade_id", { nullsFirst: true })
      .order("dia_semana")
      .order("hora_inicio"),
    supabase
      .from("espaco_feriados_personalizados")
      .select("id, nome, data_inicio, data_fim, operar_no_feriado, recorrente_anual, hora_inicio, hora_fim, sobrepor_grade")
      .eq("espaco_generico_id", selectedSpace.id)
      .gte("data_fim", new Date().toISOString().slice(0, 10))
      .order("data_inicio")
      .limit(30),
    supabase
      .from("espaco_planos_socio")
      .select(
        "id, nome, mensalidade_centavos, ativo, reservas_gratuitas_semana, limite_reservas_semana, cooldown_horas, antecedencia_max_dias, beneficios_json"
      )
      .eq("espaco_generico_id", selectedSpace.id)
      .eq("ativo", true)
      .order("ordem"),
    supabase
      .from("parceiro_conta_asaas")
      .select("nome_razao_social, cpf_cnpj, email, onboarding_status, wallet_id")
      .eq("usuario_id", user.id)
      .maybeSingle(),
    deveCarregarPlanosPaaS
        ? supabase
            .from("espaco_plano_mensal_plataforma")
          .select("id, nome, categoria_espaco, min_unidades, max_unidades, valor_mensal_centavos, socios_mensal_modo")
            .is("espaco_generico_id", null)
            .eq("ativo", true)
            .eq("liberacao", "publico")
            .order("ordem", { ascending: true })
      : Promise.resolve({ data: [] as never[] }),
    getPaaSUnidadeGateInfo(supabase, selectedSpace.id),
  ]);

  const unidadesWizard = (unidades ?? []).map((unidade) => ({
    ...unidade,
    logo_arquivo: resolveEspacoPublicAssetUrl(supabase, unidade.logo_arquivo),
  }));
  const logoCadastradoNoOnboarding =
    selectedSpace.logo_arquivo ??
    (await getLogoCadastradoNoOnboardingDeLocais({
      supabase,
      userId: user.id,
      space: selectedSpace,
      }));
  const venueConfig = parseJsonRecord(selectedSpace.venue_config_json);
  const reservaConfig = normalizeEspacoReservaConfig(selectedSpace.configuracao_reservas_json);
  const categoriaPlano = selectedSpace.categoria_mensalidade ?? "outro";
  const planosPaaSBrutos = (planosPaaS ?? []) as Array<{
    id: number;
    nome: string;
    categoria_espaco: string;
    min_unidades: number;
    max_unidades: number | null;
    valor_mensal_centavos: number;
    socios_mensal_modo: string | null;
  }>;
  const planosCategoria = planosPaaSBrutos.filter((plano) => plano.categoria_espaco === categoriaPlano);
  const planosFallback = planosPaaSBrutos.filter((plano) => plano.categoria_espaco === "condominio");
  const planosPaaSWizard = planosCategoria.length > 0 ? planosCategoria : planosFallback.length > 0 ? planosFallback : planosPaaSBrutos;
  const locaisWizard = (locaisExistentes ?? []).map((local) => {
    const cfg = parseJsonRecord(local.venue_config_json);
    return {
      id: local.id,
      slug: local.slug,
      nome_publico: local.nome_publico,
      localizacao: local.localizacao,
      logo_arquivo: resolveEspacoPublicAssetUrl(supabase, local.logo_arquivo),
      endereco: String(cfg.endereco ?? ""),
      numero: String(cfg.numero ?? ""),
      bairro: String(cfg.bairro ?? ""),
      cidade: String(cfg.cidade ?? local.cidade ?? ""),
      estado: String(cfg.estado ?? local.uf ?? ""),
      cep: String(cfg.cep ?? ""),
      complemento: String(cfg.complemento ?? ""),
    };
  });

  return (
    <EspacoOnboardingWizard
      space={{
        id: selectedSpace.id,
        nome_publico: selectedSpace.nome_publico,
        slug: selectedSpace.slug,
        categoria_mensalidade: selectedSpace.categoria_mensalidade,
        modo_reserva: selectedSpace.modo_reserva,
        aceita_socios: selectedSpace.aceita_socios,
        esportes_ids: parseEsportesIds(selectedSpace.esportes_ids),
        logo_arquivo: logoCadastradoNoOnboarding,
        cover_arquivo: selectedSpace.cover_arquivo,
        cidade: selectedSpace.cidade,
        uf: selectedSpace.uf,
        endereco: String(venueConfig.endereco ?? ""),
        numero: String(venueConfig.numero ?? ""),
        bairro: String(venueConfig.bairro ?? ""),
        cep: String(venueConfig.cep ?? ""),
        complemento: String(venueConfig.complemento ?? ""),
        reserva_observacoes: String(reservaConfig.observacoesPublicas ?? reservaConfig.politicaCancelamento ?? ""),
        descricao_curta: selectedSpace.descricao_curta,
        descricao_longa: selectedSpace.descricao_longa,
        whatsapp_contato: selectedSpace.whatsapp_contato,
        email_contato: selectedSpace.email_contato,
        website_url: selectedSpace.website_url,
        instagram_url: selectedSpace.instagram_url,
      }}
      esportes={(esportes ?? []) as Array<{ id: number; nome: string }>}
      locaisExistentes={locaisWizard}
      unidades={unidadesWizard as Array<{
        id: number; nome: string; tipo_unidade: string;
        superficie: string | null; esporte_id: number | null; modalidade: string | null;
        coberta: boolean; indoor: boolean; iluminacao: boolean;
        aceita_aulas: boolean; aceita_torneios: boolean; observacoes: string | null;
        logo_arquivo: string | null; modo_reserva: string | null; intervalo_minutos: number | null;
        configuracao_agenda_json: unknown;
      }>}
      unidadeGate={unidadeGate}
      planosPaaS={planosPaaSWizard as Array<{
        id: number;
        nome: string;
        min_unidades: number;
        max_unidades: number | null;
        valor_mensal_centavos: number;
        socios_mensal_modo: string | null;
      }>}
      horarios={(horarios ?? []) as Array<{
        id: number; espaco_unidade_id: number | null; dia_semana: number;
        hora_inicio: string; hora_fim: string; observacoes: string | null;
      }>}
      feriados={(feriados ?? []) as Array<{
        id: number; nome: string | null; data_inicio: string; data_fim: string;
        operar_no_feriado: boolean; recorrente_anual: boolean | null;
        hora_inicio: string | null; hora_fim: string | null; sobrepor_grade: boolean | null;
      }>}
      planos={(planos ?? []) as Array<{
        id: number;
        nome: string;
        mensalidade_centavos: number;
        reservas_gratuitas_semana?: number | null;
        limite_reservas_semana?: number | null;
        cooldown_horas?: number | null;
        antecedencia_max_dias?: number | null;
        beneficios_json?: Record<string, unknown> | null;
      }>}
      parceiro={(parceiro as {
        nome_razao_social: string | null;
        cpf_cnpj: string | null;
        email: string | null;
        onboarding_status: string | null;
      } | null) ?? null}
      reservaConfig={reservaConfig}
    />
  );
}
