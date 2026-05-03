import { redirect } from "next/navigation";
import {
  type ProfessorModoEsportivo,
  type ProfessorObjetivoPlataforma,
  type ProfessorTipoAtuacao,
} from "@/lib/professor/constants";
import {
  listarPapeis,
  normalizarPapeisContaPrincipal,
  obterDetalhesPapel,
  precisaEsportesPratica,
} from "@/lib/roles";
import { legalAcceptanceIsCurrent, PROFILE_LEGAL_ACCEPTANCE_COLUMNS } from "@/lib/legal/acceptance";
import { createClient } from "@/lib/supabase/server";
import { isSportMatchEnabled } from "@/lib/sport-capabilities";
import { canAccessSystemFeature, getSystemFeatureConfig } from "@/lib/system-features";
import { OnboardingWizard } from "./onboarding-wizard";

type Step = "papeis" | "esportes" | "extras" | "perfil";

function primeiroNomeDe(nome: string | null | undefined): string {
  const t = (nome ?? "").trim();
  if (!t) return "Atleta";
  return t.split(/\s+/u)[0] || "Atleta";
}

export type OnboardingStreamProps = {
  viewerId: string;
};

export async function OnboardingStream({ viewerId }: OnboardingStreamProps) {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      `id, nome, username, localizacao, avatar_url, altura_cm, peso_kg, lado, bio, estilo_jogo, disponibilidade_semana_json, perfil_completo, onboarding_etapa, ${PROFILE_LEGAL_ACCEPTANCE_COLUMNS}`
    )
    .eq("id", viewerId)
    .maybeSingle();

  if (!profile || !legalAcceptanceIsCurrent(profile)) {
    redirect(`/conta/aceitar-termos?next=${encodeURIComponent("/onboarding")}`);
  }
  if (profile.id !== viewerId) redirect("/dashboard");
  if (profile.perfil_completo) redirect("/dashboard");

  const { data: papeisRows } = await supabase
    .from("usuario_papeis")
    .select("papel, detalhes_json")
    .eq("usuario_id", viewerId);

  const papeis = normalizarPapeisContaPrincipal(listarPapeis(papeisRows));
  const detalhesAtleta = obterDetalhesPapel(papeisRows, "atleta");
  const detalhesOrganizador = obterDetalhesPapel(papeisRows, "organizador");
  const detalhesEspaco = obterDetalhesPapel(papeisRows, "espaco");
  const professorContaDedicada = papeis.includes("professor");

  const { data: eidRows } = await supabase.from("usuario_eid").select("esporte_id").eq("usuario_id", viewerId);
  const selectedEsportes = (eidRows ?? []).map((r) => r.esporte_id);

  const { data: professorEsportesRows } = professorContaDedicada
    ? await supabase
        .from("professor_esportes")
        .select("esporte_id, modo_atuacao, objetivo_plataforma, tipo_atuacao, tempo_experiencia")
        .eq("professor_id", viewerId)
        .eq("ativo", true)
    : { data: [] };

  const { data: professorPerfil } = professorContaDedicada
    ? await supabase
        .from("professor_perfil")
        .select(
          "headline, bio_profissional, certificacoes_json, publico_alvo_json, formato_aula_json, politica_cancelamento_json, aceita_novos_alunos, perfil_publicado"
        )
        .eq("usuario_id", viewerId)
        .maybeSingle()
    : { data: null };

  const selectedSportModes: Record<number, ProfessorModoEsportivo> = {};
  const selectedProfessorObjetivos: Record<number, ProfessorObjetivoPlataforma> = {};
  const selectedProfessorTipos: Record<number, ProfessorTipoAtuacao[]> = {};
  const selectedProfessorExp: Record<number, string> = {};
  const selectedEsportesSet = new Set<number>(selectedEsportes);

  for (const row of professorEsportesRows ?? []) {
    const esporteId = Number(row.esporte_id);
    if (!Number.isFinite(esporteId)) continue;
    selectedEsportesSet.add(esporteId);
    selectedSportModes[esporteId] = professorContaDedicada
      ? "professor"
      : row.modo_atuacao === "professor_e_atleta"
        ? "ambos"
        : "professor";
    selectedProfessorObjetivos[esporteId] =
      row.objetivo_plataforma === "gerir_alunos" || row.objetivo_plataforma === "ambos"
        ? row.objetivo_plataforma
        : "somente_exposicao";
    selectedProfessorTipos[esporteId] = Array.isArray(row.tipo_atuacao)
      ? row.tipo_atuacao
          .map((item) => String(item))
          .filter((item): item is ProfessorTipoAtuacao =>
            ["aulas", "treinamento", "consultoria"].includes(item)
          )
      : ["aulas"];
    if (row.tempo_experiencia) {
      selectedProfessorExp[esporteId] = String(row.tempo_experiencia);
    }
  }

  for (const esporteId of selectedEsportes) {
    if (!selectedSportModes[esporteId]) {
      selectedSportModes[esporteId] = professorContaDedicada ? "professor" : "atleta";
    }
  }

  const selectedEsportesAll = [...selectedEsportesSet];
  const hasAthleteSports =
    !professorContaDedicada &&
    selectedEsportes.some((esporteId) => selectedSportModes[esporteId] !== "professor");

  const needsSport = precisaEsportesPratica(papeis);

  let initialStep: Step = "perfil";
  if (papeis.length === 0) {
    initialStep = "papeis";
  } else if (needsSport && selectedEsportesAll.length === 0) {
    initialStep = "esportes";
  } else if ((profile.onboarding_etapa ?? 0) < 3) {
    initialStep = "extras";
  } else {
    initialStep = "perfil";
  }

  const { data: esportes } = await supabase
    .from("esportes")
    .select("id, nome, permite_individual, permite_dupla, permite_time")
    .eq("ativo", true)
    .order("ordem", { ascending: true });

  const { data: locais } = await supabase
    .from("espacos_genericos")
    .select("id, nome_publico, localizacao, responsavel_usuario_id, criado_por_usuario_id")
    .eq("ativo_listagem", true)
    .order("id", { ascending: false })
    .limit(80);

  const featureCfg = await getSystemFeatureConfig(supabase);
  const roleModes = {
    professor: canAccessSystemFeature(featureCfg, "professores", viewerId),
    organizador: canAccessSystemFeature(featureCfg, "organizador_torneios", viewerId),
    espaco: canAccessSystemFeature(featureCfg, "locais", viewerId),
  };
  const roleFeatureModes = {
    professor: featureCfg.professores.mode,
    organizador: featureCfg.organizador_torneios.mode,
    espaco: featureCfg.locais.mode,
  };

  return (
    <OnboardingWizard
      userId={viewerId}
      primeiroNome={primeiroNomeDe(profile.nome)}
      initialStep={initialStep}
      esportes={(esportes ?? []).map((e) => ({
        id: e.id,
        nome: e.nome,
        permiteIndividual: Boolean(e.permite_individual),
        permiteDupla: Boolean(e.permite_dupla),
        permiteTime: Boolean(e.permite_time),
        suportaConfronto: isSportMatchEnabled(e.nome),
      }))}
      locais={(locais ?? []).map((l) => ({
        id: l.id,
        nome: l.nome_publico,
        localizacao: l.localizacao ?? "",
        donoUsuarioId: l.responsavel_usuario_id ?? l.criado_por_usuario_id ?? null,
      }))}
      selectedPapeis={papeis}
      roleModes={roleModes}
      roleFeatureModes={roleFeatureModes}
      selectedEsportes={selectedEsportesAll}
      selectedSportModes={selectedSportModes}
      selectedProfessorObjetivos={selectedProfessorObjetivos}
      selectedProfessorTipos={selectedProfessorTipos}
      extrasInitial={{
        expModo: detalhesAtleta.experiencia_modo === "exato" ? "exato" : "aprox",
        expAprox:
          detalhesAtleta.experiencia_aprox === "menos_1" ||
          detalhesAtleta.experiencia_aprox === "mais_3"
            ? (detalhesAtleta.experiencia_aprox as "menos_1" | "mais_3")
            : "1_3",
        expMes:
          typeof detalhesAtleta.experiencia_mes === "number"
            ? detalhesAtleta.experiencia_mes
            : null,
        expAno:
          typeof detalhesAtleta.experiencia_ano === "number"
            ? detalhesAtleta.experiencia_ano
            : null,
        professorHeadline:
          typeof professorPerfil?.headline === "string" ? professorPerfil.headline : "",
        professorBio:
          typeof professorPerfil?.bio_profissional === "string" ? professorPerfil.bio_profissional : "",
        professorCertificacoes: Array.isArray(professorPerfil?.certificacoes_json)
          ? professorPerfil?.certificacoes_json.map((item) => String(item)).join(", ")
          : "",
        professorPublicoAlvo: Array.isArray(professorPerfil?.publico_alvo_json)
          ? professorPerfil?.publico_alvo_json.map((item) => String(item)).join(", ")
          : "",
        professorFormatoAula: Array.isArray(professorPerfil?.formato_aula_json)
          ? professorPerfil?.formato_aula_json.map((item) => String(item)).join(", ")
          : "",
        professorPoliticaCancelamento:
          typeof professorPerfil?.politica_cancelamento_json === "object" &&
          professorPerfil?.politica_cancelamento_json &&
          "resumo" in professorPerfil.politica_cancelamento_json
            ? String(professorPerfil.politica_cancelamento_json.resumo ?? "")
            : "",
        professorAceitaNovosAlunos:
          typeof professorPerfil?.aceita_novos_alunos === "boolean"
            ? professorPerfil.aceita_novos_alunos
            : true,
        professorPerfilPublicado:
          typeof professorPerfil?.perfil_publicado === "boolean"
            ? professorPerfil.perfil_publicado
            : false,
        orgEsporteId:
          typeof detalhesOrganizador.esporte_torneio_id === "number" ? detalhesOrganizador.esporte_torneio_id : null,
        orgEsportesIds: Array.isArray(detalhesOrganizador.esporte_torneio_ids)
          ? detalhesOrganizador.esporte_torneio_ids
              .map((x) => Number(x))
              .filter((n) => Number.isFinite(n))
          : [],
        orgLocalModo: detalhesOrganizador.local_modo === "novo" ? "novo" : "existente",
        orgLocalId:
          typeof detalhesOrganizador.local_preferido_id === "number"
            ? detalhesOrganizador.local_preferido_id
            : null,
        orgLocalMsg:
          typeof detalhesOrganizador.solicitacao_local_mensagem === "string"
            ? detalhesOrganizador.solicitacao_local_mensagem
            : "",
        espacoNome:
          typeof detalhesEspaco.nome_publico === "string" ? detalhesEspaco.nome_publico : "",
        espacoEsportes: Array.isArray(detalhesEspaco.esportes_ids)
          ? detalhesEspaco.esportes_ids
              .map((x) => Number(x))
              .filter((n) => Number.isFinite(n))
          : [],
        estruturas: Array.isArray(detalhesEspaco.estruturas)
          ? detalhesEspaco.estruturas.map((x) => String(x))
          : [],
        reservaModelo:
          detalhesEspaco.reserva_modelo === "socios" ||
          detalhesEspaco.reserva_modelo === "pago" ||
          detalhesEspaco.reserva_modelo === "misto"
            ? (detalhesEspaco.reserva_modelo as "socios" | "pago" | "misto")
            : "livre",
        reservaNotas:
          typeof detalhesEspaco.reserva_notas === "string" ? detalhesEspaco.reserva_notas : "",
        espacoEndereco: typeof detalhesEspaco.endereco === "string" ? detalhesEspaco.endereco : "",
        espacoNumero: typeof detalhesEspaco.numero === "string" ? detalhesEspaco.numero : "",
        espacoBairro: typeof detalhesEspaco.bairro === "string" ? detalhesEspaco.bairro : "",
        espacoCidade: typeof detalhesEspaco.cidade === "string" ? detalhesEspaco.cidade : "",
        espacoEstado: typeof detalhesEspaco.estado === "string" ? detalhesEspaco.estado : "",
        espacoCep: typeof detalhesEspaco.cep === "string" ? detalhesEspaco.cep : "",
        espacoComplemento:
          typeof detalhesEspaco.complemento === "string" ? detalhesEspaco.complemento : "",
      }}
      profileInitial={{
        nome: profile.nome ?? "",
        username: profile.username ?? "",
        localizacao: profile.localizacao ?? "",
        alturaCm: hasAthleteSports ? (profile.altura_cm ?? null) : null,
        pesoKg: hasAthleteSports ? (profile.peso_kg ?? null) : null,
        lado: hasAthleteSports ? (profile.lado ?? null) : null,
        avatarUrl: profile.avatar_url ?? null,
        bio: profile.bio ?? "",
        estiloJogo: profile.estilo_jogo ?? "",
        disponibilidadeSemanaJson: JSON.stringify(profile.disponibilidade_semana_json ?? {}),
      }}
      selectedProfessorExp={selectedProfessorExp}
    />
  );
}
