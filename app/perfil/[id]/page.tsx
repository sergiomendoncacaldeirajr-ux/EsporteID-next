import { notFound, redirect } from "next/navigation";
import { getServerAuth } from "@/lib/auth/rsc-auth";
import { loginNextWithOptionalFrom } from "@/lib/auth/login-next-path";
import { resolveEspacoPublicPathForUsuario } from "@/lib/espacos/public-path-for-usuario";
import { canAccessSystemFeature, getSystemFeatureConfig } from "@/lib/system-features";
import { computeDisponivelAmistosoEffective } from "@/lib/perfil/disponivel-amistoso";
import { listarPapeis } from "@/lib/roles";
import { EidStreamSection } from "@/components/eid-stream-section";
import { ProfilePublicBelowFoldSkeleton } from "@/components/loading/profile-app-skeletons";
import { PROFILE_PUBLIC_MAIN_CLASS } from "@/components/perfil/profile-ui-tokens";
import { PerfilPublicoBelowFold } from "./perfil-public-below-fold";
import { PerfilPublicoHero } from "./perfil-public-hero";
import type { PerfilPublicoEidRow, PerfilPublicoProfileRow } from "./perfil-public-shared";

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ from?: string }>;
};

export default async function PerfilPublicoPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = (await searchParams) ?? {};

  const { supabase, user } = await getServerAuth();
  if (!user) redirect(loginNextWithOptionalFrom(`/perfil/${id}`, sp));

  const isSelf = user.id === id;
  const { data: papeisRows } = await supabase.from("usuario_papeis").select("papel").eq("usuario_id", id);
  const papeisLista = listarPapeis(papeisRows);

  if (!papeisLista.includes("atleta")) {
    if (papeisLista.includes("professor")) {
      redirect(isSelf ? "/professor" : `/professor/${id}`);
    }
    if (papeisLista.includes("organizador")) {
      redirect(isSelf ? "/organizador" : `/organizador/${id}`);
    }
    if (papeisLista.includes("espaco")) {
      if (isSelf) redirect("/espaco");
      const espPublic = await resolveEspacoPublicPathForUsuario(supabase, id);
      if (espPublic) redirect(espPublic);
      notFound();
    }
    // Sem papel explícito: pode ser atleta legado sem entrada em usuario_papeis.
    // O check de tipo_usuario abaixo filtra perfis realmente incompletos.
  }

  const perfilSelect =
    "id, nome, username, avatar_url, whatsapp, localizacao, altura_cm, peso_kg, lado, foto_capa, tipo_usuario, genero, tempo_experiencia, interesse_rank_match, interesse_torneio, disponivel_amistoso, disponivel_amistoso_ate, mostrar_historico_publico, estilo_jogo, bio, perfil_completo, match_maioridade_confirmada";

  const [{ data: perfil }, { data: eids }, amRowRes, featureCfg] = await Promise.all([
    supabase.from("profiles").select(perfilSelect).eq("id", id).maybeSingle(),
    supabase
      .from("usuario_eid")
      .select(
        "esporte_id, nota_eid, vitorias, derrotas, pontos_ranking, partidas_jogadas, interesse_match, modalidade_match, posicao_rank, esportes(nome, tipo, permite_individual)",
      )
      .eq("usuario_id", id)
      .order("pontos_ranking", { ascending: false })
      .limit(80),
    user.id === id
      ? supabase.from("profiles").select("disponivel_amistoso, disponivel_amistoso_ate").eq("id", id).maybeSingle()
      : Promise.resolve({ data: null }),
    getSystemFeatureConfig(supabase),
  ]);

  const canOpenLocais = canAccessSystemFeature(featureCfg, "locais", user.id, false);
  if (!perfil) notFound();
  if ((perfil.tipo_usuario === "pendente" || !perfil.perfil_completo) && !isSelf) notFound();

  let disponivelAmistosoVal = perfil.disponivel_amistoso;
  let disponivelAmistosoAteVal = perfil.disponivel_amistoso_ate as string | null | undefined;
  if (isSelf && amRowRes.data) {
    disponivelAmistosoVal = amRowRes.data.disponivel_amistoso;
    disponivelAmistosoAteVal = amRowRes.data.disponivel_amistoso_ate;
  }
  const amistosoPerfilOn = computeDisponivelAmistosoEffective(disponivelAmistosoVal, disponivelAmistosoAteVal);
  const amistosoPerfilExpiresAt = amistosoPerfilOn && disponivelAmistosoAteVal ? String(disponivelAmistosoAteVal) : null;

  const hasProfessor = papeisLista.includes("professor");
  const hasOrganizador = papeisLista.includes("organizador");
  const hasEspaco = papeisLista.includes("espaco");

  const principalEid =
    eids && eids.length > 0
      ? [...eids].sort((a, b) => Number(b.nota_eid ?? 0) - Number(a.nota_eid ?? 0))[0]
      : null;
  let vitT = 0;
  let derT = 0;
  for (const e of eids ?? []) {
    vitT += Number(e.vitorias ?? 0);
    derT += Number(e.derrotas ?? 0);
  }
  const jogosT = vitT + derT;
  const winRate = jogosT > 0 ? Math.round((vitT / jogosT) * 100) : null;
  const conquistas: string[] = [];
  if ((eids ?? []).length >= 3) conquistas.push("Multi-esporte");
  if ((winRate ?? 0) >= 60 && jogosT >= 10) conquistas.push("Winrate 60%+");
  if ((principalEid?.posicao_rank ?? 9999) <= 10) conquistas.push("Top 10");
  if ((principalEid?.nota_eid ?? 0) >= 7) conquistas.push("EID Elite");

  return (
    <main
      id="perfil-public-main"
      data-eid-perfil-page
      data-eid-touch-ui
      data-eid-no-route-enter
      className={`${PROFILE_PUBLIC_MAIN_CLASS} eid-progressive-enter`}
    >
      <PerfilPublicoHero
        perfil={perfil as PerfilPublicoProfileRow}
        profileId={id}
        isSelf={isSelf}
        hasProfessor={hasProfessor}
        hasOrganizador={hasOrganizador}
        hasEspaco={hasEspaco}
        vitT={vitT}
        derT={derT}
        winRate={winRate}
        jogosT={jogosT}
        conquistas={conquistas}
        amistosoPerfilOn={amistosoPerfilOn}
        amistosoPerfilExpiresAt={amistosoPerfilExpiresAt}
      />
      <EidStreamSection fallback={<ProfilePublicBelowFoldSkeleton />}>
        <PerfilPublicoBelowFold
          profileId={id}
          viewerId={user.id}
          perfil={perfil as PerfilPublicoProfileRow}
          canOpenLocais={canOpenLocais}
          isSelf={isSelf}
          hasProfessor={hasProfessor}
          eids={eids as PerfilPublicoEidRow[] | null}
          amistosoPerfilOn={amistosoPerfilOn}
        />
      </EidStreamSection>
    </main>
  );
}
