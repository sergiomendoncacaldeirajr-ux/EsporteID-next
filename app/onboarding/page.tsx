import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingWizard } from "./onboarding-wizard";

type Step = "papeis" | "esportes" | "extras" | "perfil";

function primeiroNomeDe(nome: string | null | undefined): string {
  const t = (nome ?? "").trim();
  if (!t) return "Atleta";
  return t.split(/\s+/u)[0] || "Atleta";
}

function precisaEsportesPratica(papeis: string[]): boolean {
  return papeis.some((p) => p === "atleta" || p === "professor");
}

function parseDetalhes(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === "object") return raw as Record<string, unknown>;
  if (typeof raw !== "string") return {};
  try {
    const p = JSON.parse(raw);
    return p && typeof p === "object" ? (p as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/onboarding");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "nome, username, localizacao, avatar_url, altura_cm, peso_kg, lado, bio, estilo_jogo, disponibilidade_semana_json, termos_aceitos_em, perfil_completo, onboarding_etapa"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.termos_aceitos_em) redirect("/conta/aceitar-termos");
  if (profile.perfil_completo) redirect("/dashboard");

  const { data: papeisRows } = await supabase
    .from("usuario_papeis")
    .select("papel, detalhes_json")
    .eq("usuario_id", user.id);

  const papeis = (papeisRows ?? []).map((r) => r.papel);
  const detalhesAtleta = parseDetalhes(
    (papeisRows ?? []).find((r) => r.papel === "atleta" || r.papel === "professor")
      ?.detalhes_json
  );
  const detalhesOrganizador = parseDetalhes(
    (papeisRows ?? []).find((r) => r.papel === "organizador")?.detalhes_json
  );
  const detalhesEspaco = parseDetalhes(
    (papeisRows ?? []).find((r) => r.papel === "espaco")?.detalhes_json
  );

  const { data: eidRows } = await supabase
    .from("usuario_eid")
    .select("esporte_id, interesse_match, modalidade_match")
    .eq("usuario_id", user.id);
  const selectedEsportes = (eidRows ?? []).map((r) => r.esporte_id);
  const selectedEsportesInteresse = Object.fromEntries(
    (eidRows ?? []).map((r) => [
      r.esporte_id,
      r.interesse_match === "ranking"
        ? "ranking"
        : r.interesse_match === "amistoso"
          ? "amistoso"
          : "ranking_e_amistoso",
    ])
  ) as Record<number, "ranking" | "ranking_e_amistoso" | "amistoso">;
  const selectedEsportesModalidade = Object.fromEntries(
    (eidRows ?? []).map((r) => [
      r.esporte_id,
      r.modalidade_match === "dupla" || r.modalidade_match === "time" ? r.modalidade_match : "individual",
    ])
  ) as Record<number, "individual" | "dupla" | "time">;

  const needsSport = precisaEsportesPratica(papeis);

  let initialStep: Step = "perfil";
  if (papeis.length === 0) {
    initialStep = "papeis";
  } else if (needsSport && selectedEsportes.length === 0) {
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

  return (
    <OnboardingWizard
      userId={user.id}
      primeiroNome={primeiroNomeDe(profile.nome)}
      initialStep={initialStep}
      esportes={(esportes ?? []).map((e) => ({
        id: e.id,
        nome: e.nome,
        permiteIndividual: Boolean(e.permite_individual),
        permiteDupla: Boolean(e.permite_dupla),
        permiteTime: Boolean(e.permite_time),
      }))}
      locais={(locais ?? []).map((l) => ({
        id: l.id,
        nome: l.nome_publico,
        localizacao: l.localizacao ?? "",
        donoUsuarioId: l.responsavel_usuario_id ?? l.criado_por_usuario_id ?? null,
      }))}
      selectedPapeis={papeis}
      selectedEsportes={selectedEsportes}
      selectedEsportesInteresse={selectedEsportesInteresse}
      selectedEsportesModalidade={selectedEsportesModalidade}
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
        alturaCm: profile.altura_cm ?? null,
        pesoKg: profile.peso_kg ?? null,
        lado: profile.lado ?? null,
        avatarUrl: profile.avatar_url ?? null,
        bio: profile.bio ?? "",
        estiloJogo: profile.estilo_jogo ?? "",
        disponibilidadeSemanaJson: JSON.stringify(profile.disponibilidade_semana_json ?? {}),
      }}
    />
  );
}
