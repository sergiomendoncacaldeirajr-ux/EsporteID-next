import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ProfileAvatarControl } from "@/components/perfil/profile-avatar-control";
import { ProfileEditDrawerTrigger } from "@/components/perfil/profile-edit-drawer-trigger";
import { ProfileCoverControl } from "@/components/perfil/profile-cover-control";
import { ProfilePrimaryCta, ProfileSection } from "@/components/perfil/profile-layout-blocks";
import { ProfileSolicitarMatchMenu } from "@/components/perfil/profile-solicitar-match-menu";
import { ProfileDenunciarButton } from "@/components/perfil/profile-denunciar-button";
import { MatchIdadeGateBanner } from "@/components/perfil/match-idade-gate-banner";
import { PROFILE_HERO_PANEL_CLASS, PROFILE_PUBLIC_MAIN_CLASS } from "@/components/perfil/profile-ui-tokens";
import { ProfileConviteFormacaoCta } from "@/components/perfil/profile-convite-formacao-cta";
import { ProfileFriendlyStatusToggle } from "@/components/perfil/profile-friendly-status-toggle";
import {
  esporteIdsComMatchAceitoEntre,
  podeExibirWhatsappProfessor,
  podeExibirWhatsappPerfilPublico,
  waMeHref,
} from "@/lib/perfil/whatsapp-visibility";
import { loginNextWithOptionalFrom } from "@/lib/auth/login-next-path";
import {
  computeDisponivelAmistosoEffective,
  expireDisponivelAmistosoProfileIfNeeded,
} from "@/lib/perfil/disponivel-amistoso";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ from?: string }>;
};

const HISTORICO_STATUS_CONCLUIDO = new Set(["concluida", "concluído", "finalizada", "encerrada"]);

export default async function PerfilPublicoPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = (await searchParams) ?? {};

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(loginNextWithOptionalFrom(`/perfil/${id}`, sp));

  const { data: perfil } = await supabase
    .from("profiles")
    .select(
      "id, nome, username, avatar_url, whatsapp, localizacao, altura_cm, peso_kg, lado, foto_capa, tipo_usuario, genero, tempo_experiencia, interesse_rank_match, interesse_torneio, disponivel_amistoso, disponivel_amistoso_ate, mostrar_historico_publico, estilo_jogo, bio"
    )
    .eq("id", id)
    .maybeSingle();
  if (!perfil) notFound();

  const isSelf = user.id === id;
  let disponivelAmistosoVal = perfil.disponivel_amistoso;
  let disponivelAmistosoAteVal = perfil.disponivel_amistoso_ate as string | null | undefined;
  if (isSelf) {
    await expireDisponivelAmistosoProfileIfNeeded(supabase, user.id);
    const { data: amRow } = await supabase
      .from("profiles")
      .select("disponivel_amistoso, disponivel_amistoso_ate")
      .eq("id", id)
      .maybeSingle();
    if (amRow) {
      disponivelAmistosoVal = amRow.disponivel_amistoso;
      disponivelAmistosoAteVal = amRow.disponivel_amistoso_ate;
    }
  }
  const amistosoPerfilOn = computeDisponivelAmistosoEffective(disponivelAmistosoVal, disponivelAmistosoAteVal);
  const amistosoPerfilExpiresAt = amistosoPerfilOn && disponivelAmistosoAteVal ? String(disponivelAmistosoAteVal) : null;

  let viewerAmistosoOn = false;
  if (!isSelf) {
    await expireDisponivelAmistosoProfileIfNeeded(supabase, user.id);
    const { data: viewerAmRow } = await supabase
      .from("profiles")
      .select("disponivel_amistoso, disponivel_amistoso_ate")
      .eq("id", user.id)
      .maybeSingle();
    viewerAmistosoOn = computeDisponivelAmistosoEffective(
      viewerAmRow?.disponivel_amistoso,
      viewerAmRow?.disponivel_amistoso_ate
    );
  }

  let viewerMatchIdadeGate = "ok";
  if (isSelf) {
    const { data: mgRow } = await supabase.from("profiles").select("match_idade_gate").eq("id", user.id).maybeSingle();
    viewerMatchIdadeGate = String(mgRow?.match_idade_gate ?? "ok");
  }

  const [{ data: papeisRows }, { data: professorPerfil }, { data: professorEsportes }, { data: professorMetricas }] =
    await Promise.all([
      supabase.from("usuario_papeis").select("papel").eq("usuario_id", id),
      supabase
        .from("professor_perfil")
        .select("headline, bio_profissional, aceita_novos_alunos, perfil_publicado")
        .eq("usuario_id", id)
        .maybeSingle(),
      supabase
        .from("professor_esportes")
        .select("tipo_atuacao, valor_base_centavos, esportes(nome)")
        .eq("professor_id", id)
        .eq("ativo", true),
      supabase
        .from("professor_metricas")
        .select("nota_docente, total_avaliacoes_validas, esportes(nome)")
        .eq("professor_id", id)
        .order("nota_docente", { ascending: false }),
    ]);
  const papeis = (papeisRows ?? []).map((row) => row.papel);
  const hasProfessor = papeis.includes("professor");
  const hasOrganizador = papeis.includes("organizador");
  const hasEspaco = papeis.includes("espaco");

  const podeVerWhatsappAtleta = await podeExibirWhatsappPerfilPublico(supabase, user.id, id, isSelf);
  const podeVerWhatsappProfessor = hasProfessor
    ? await podeExibirWhatsappProfessor(supabase, user.id, id, isSelf)
    : false;
  const podeVerWhatsapp = podeVerWhatsappAtleta || podeVerWhatsappProfessor;
  const linkWpp = podeVerWhatsapp ? waMeHref(perfil.whatsapp) : null;
  const esportesMatchAceito = isSelf
    ? new Set<number>()
    : await esporteIdsComMatchAceitoEntre(supabase, user.id, id);

  const { data: eids } = await supabase
    .from("usuario_eid")
    .select(
      "esporte_id, nota_eid, vitorias, derrotas, pontos_ranking, partidas_jogadas, interesse_match, modalidade_match, posicao_rank, esportes(nome)"
    )
    .eq("usuario_id", id)
    .order("pontos_ranking", { ascending: false });

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

  const { data: timesLider } = await supabase
    .from("times")
    .select("id, nome, tipo, escudo, esporte_id, esportes(nome)")
    .eq("criador_id", id)
    .order("id", { ascending: false })
    .limit(12);

  const { data: duplasCadastro } = await supabase
    .from("duplas")
    .select("id, esporte_id, esportes(nome)")
    .or(`player1_id.eq.${id},player2_id.eq.${id}`)
    .limit(12);

  const [
    { count: alvoMembrosCount },
    { count: alvoLiderTimesCount },
    { count: alvoDuplasCount },
  ] = await Promise.all([
    supabase
      .from("membros_time")
      .select("id", { count: "exact", head: true })
      .eq("usuario_id", id)
      .in("status", ["ativo", "aceito", "aprovado"]),
    supabase.from("times").select("id", { count: "exact", head: true }).eq("criador_id", id),
    supabase.from("duplas").select("id", { count: "exact", head: true }).or(`player1_id.eq.${id},player2_id.eq.${id}`),
  ]);

  const alvoSemFormacao =
    (alvoMembrosCount ?? 0) === 0 && (alvoLiderTimesCount ?? 0) === 0 && (alvoDuplasCount ?? 0) === 0;

  const semCardsEquipesPerfil = (timesLider ?? []).length === 0 && (duplasCadastro ?? []).length === 0;
  /** Visitante vendo atleta sem formação: o bloco "Dupla ou time" cobre o vazio — não repetir seção Equipes. */
  const ocultarSecaoEquipesParaVisitante = !isSelf && alvoSemFormacao && semCardsEquipesPerfil;

  let minhasFormacoesLider: Array<{
    id: number;
    nome: string;
    tipo: string | null;
    esporte_id: number | null;
    esporteNome: string;
  }> = [];

  if (!isSelf) {
    const { data: liderRows } = await supabase
      .from("times")
      .select("id, nome, tipo, esporte_id, esportes(nome)")
      .eq("criador_id", user.id)
      .order("id", { ascending: false });
    minhasFormacoesLider = (liderRows ?? []).map((t) => {
      const esp = Array.isArray(t.esportes) ? t.esportes[0] : t.esportes;
      return {
        id: Number(t.id),
        nome: t.nome ?? "Formação",
        tipo: t.tipo ?? null,
        esporte_id: t.esporte_id != null ? Number(t.esporte_id) : null,
        esporteNome: esp?.nome ?? "Esporte",
      };
    });
  }

  const targetEsporteIdsParaConvite = new Set(
    (eids ?? []).map((e) => Number(e.esporte_id)).filter((n) => Number.isFinite(n) && n > 0)
  );
  const eligibleTeamsConvite = minhasFormacoesLider.filter(
    (t) => t.esporte_id != null && targetEsporteIdsParaConvite.has(t.esporte_id)
  );

  const primeiroEsporte = eids?.[0]?.esporte_id;
  const esportesDoPerfil = (eids ?? [])
    .map((e) => ({
      esporteId: Number(e.esporte_id),
      nome: (Array.isArray(e.esportes) ? e.esportes[0] : e.esportes)?.nome ?? "Esporte",
    }))
    .filter((e) => Number.isFinite(e.esporteId) && e.esporteId > 0);
  const esportesParaDesafio = esportesDoPerfil.filter((e) => !esportesMatchAceito.has(e.esporteId));

  const { data: socioRows } = await supabase
    .from("membership_requests")
    .select("espaco_generico_id, espacos_genericos!inner(id, nome_publico, localizacao)")
    .eq("usuario_id", id)
    .eq("status", "aprovado")
    .limit(20);

  const { data: frequentesRows } = await supabase
    .from("usuario_locais_frequentes")
    .select("visitas, espacos_genericos!inner(id, nome_publico, localizacao)")
    .eq("usuario_id", id)
    .order("visitas", { ascending: false })
    .limit(10);

  const { data: partidasHistoricoRaw } = await supabase
    .from("partidas")
    .select(
      "id, jogador1_id, jogador2_id, time1_id, time2_id, placar_1, placar_2, status, torneio_id, data_resultado, data_registro"
    )
    .or(`jogador1_id.eq.${id},jogador2_id.eq.${id}`)
    .order("data_registro", { ascending: false })
    .limit(180);

  const partidasHistorico = (partidasHistoricoRaw ?? []).filter((p) => {
    if (!p.jogador1_id || !p.jogador2_id) return false;
    if (p.time1_id != null || p.time2_id != null) return false;
    const st = String(p.status ?? "").toLowerCase();
    return HISTORICO_STATUS_CONCLUIDO.has(st);
  });

  const resumoHistorico = partidasHistorico.slice(0, 4).map((p) => {
    const isP1 = p.jogador1_id === id;
    const s1 = Number(p.placar_1 ?? 0);
    const s2 = Number(p.placar_2 ?? 0);
    const venceu = isP1 ? s1 > s2 : s2 > s1;
    const empatou = s1 === s2;
    const origem = p.torneio_id ? "Torneio" : "Rank";
    const resultado = empatou ? "E" : venceu ? "V" : "D";
    const dataIso = p.data_resultado ?? p.data_registro;
    const dataFmt = dataIso ? new Date(dataIso).toLocaleDateString("pt-BR") : "—";
    return {
      id: String(p.id),
      resultado,
      origem,
      placar: `${s1}x${s2}`,
      dataFmt,
      tone: empatou ? "neutral" : venceu ? "positive" : "negative",
    };
  });

  const historicoTotais = partidasHistorico.reduce(
    (acc, p) => {
      const isP1 = p.jogador1_id === id;
      const s1 = Number(p.placar_1 ?? 0);
      const s2 = Number(p.placar_2 ?? 0);
      if (s1 === s2) acc.empates += 1;
      else if ((isP1 && s1 > s2) || (!isP1 && s2 > s1)) acc.vitorias += 1;
      else acc.derrotas += 1;
      if (p.torneio_id) acc.torneio += 1;
      else acc.rank += 1;
      return acc;
    },
    { vitorias: 0, derrotas: 0, empates: 0, rank: 0, torneio: 0 }
  );
  const mostrarHistoricoPublico = perfil.mostrar_historico_publico !== false;
  const podeVerHistorico = isSelf || mostrarHistoricoPublico;

  const conquistas: string[] = [];
  if ((eids ?? []).length >= 3) conquistas.push("Multi-esporte");
  if ((winRate ?? 0) >= 60 && jogosT >= 10) conquistas.push("Winrate 60%+");
  if ((principalEid?.posicao_rank ?? 9999) <= 10) conquistas.push("Top 10");
  if ((principalEid?.nota_eid ?? 0) >= 7) conquistas.push("EID Elite");

  return (
    <main className={PROFILE_PUBLIC_MAIN_CLASS}>
        {/* ── Hero Card ─────────────────────────────────────────────── */}
        {/* ── Hero Card ──
             overflow-hidden no container clipa tudo dentro dos cantos arredondados.
             O avatar fica na frente da capa via z-10 (elementos com z-index > 0
             sobrepõem elementos sem z-index dentro do mesmo contexto).
        */}
        <div className={`${PROFILE_HERO_PANEL_CLASS} mt-2`}>

          {/* Capa — banner generoso, claramente atrás de tudo */}
          <div className="relative h-24 w-full sm:h-28">
            {perfil.foto_capa ? (
              <>
                <img src={perfil.foto_capa} alt="" className="h-full w-full object-cover object-center" />
                {/* escurece borda inferior para o avatar ter contraste */}
                <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-eid-card/60 to-transparent" />
              </>
            ) : (
              <>
                <div className="h-full w-full" style={{ background: "linear-gradient(135deg,#172554 0%,#0b1d2e 55%,#0b0f14 100%)" }} />
                <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full blur-2xl opacity-35" style={{ background: "var(--eid-action-500)" }} />
                <div className="absolute -left-4 bottom-0 h-20 w-20 rounded-full blur-2xl opacity-20" style={{ background: "var(--eid-primary-400)" }} />
                <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 1px,transparent 14px)" }} />
              </>
            )}

            {isSelf ? (
              <div className="absolute right-2 top-2 z-[3] flex items-center gap-1.5">
                <ProfileCoverControl hasCover={Boolean(perfil.foto_capa)} />
              </div>
            ) : null}

            {isSelf ? (
              <ProfileEditDrawerTrigger
                href={`/editar/perfil?from=${encodeURIComponent(`/perfil/${id}`)}`}
                title="Editar perfil"
                fullscreen
                topMode="backOnly"
                className="absolute -bottom-[20px] right-2 z-[4] inline-flex items-center justify-center gap-1 p-0 text-[7px] font-bold uppercase leading-none tracking-[0.08em] text-eid-text-secondary transition-colors hover:text-eid-fg"
              >
                <svg viewBox="0 0 16 16" fill="currentColor" className="h-2.5 w-2.5" aria-hidden>
                  <path d="M11.875 1.625a1.768 1.768 0 0 1 2.5 2.5l-7.54 7.54a1 1 0 0 1-.46.262l-3.018.805a.5.5 0 0 1-.612-.612l.805-3.018a1 1 0 0 1 .262-.46l7.54-7.54Zm1.793 1.207a.768.768 0 0 0-1.086 0l-.812.812 1.086 1.086.812-.812a.768.768 0 0 0 0-1.086ZM11.149 5.29 4.314 12.126l-1.02.272.272-1.02L10.4 4.544l.75.75Z" />
                </svg>
                EDITAR PERFIL
              </ProfileEditDrawerTrigger>
            ) : null}

          </div>

          {/*
            ESTRUTURA DO HERO CARD:
            · Avatar (-mt-10, z-10) flutua sobre a capa
            · Nome fica ao lado do avatar alinhado pela base (items-end)
              → com só 1 linha de texto (~20px), o topo do nome cai em ~108px,
                abaixo do fim da capa (96px) ✓
            · Badges, localização e interesses ficam em linhas próprias abaixo
            · WhatsApp NÃO fica aqui — aparece no lugar do botão Match após aceito
          */}
          <div className="px-3 pb-3 pt-0">

            {/* Avatar + Nome/Selos lado a lado */}
            <div className="relative z-[3] -mt-6 flex items-end gap-3 sm:-mt-7">
              <div className="relative z-10 h-[68px] w-[68px] shrink-0">
                {perfil.avatar_url ? (
                  <img
                    src={perfil.avatar_url}
                    alt=""
                    className="h-[68px] w-[68px] rounded-full border-[3px] border-eid-card object-cover shadow-[0_0_0_2px_rgba(249,115,22,0.55),0_6px_20px_rgba(0,0,0,0.5)]"
                  />
                ) : (
                  <div className="flex h-[68px] w-[68px] items-center justify-center rounded-full border-[3px] border-eid-card bg-gradient-to-br from-eid-primary-700 to-eid-primary-900 text-sm font-black tracking-widest text-eid-primary-200 shadow-[0_0_0_2px_rgba(249,115,22,0.55),0_6px_20px_rgba(0,0,0,0.5)]">
                    EID
                  </div>
                )}
                {isSelf ? (
                  <ProfileAvatarControl hasAvatar={Boolean(perfil.avatar_url)} />
                ) : null}
              </div>
              <div className="min-w-0 flex-1 pb-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <h1 className="text-[13px] font-black leading-tight tracking-tight text-eid-fg drop-shadow-[0_1px_6px_rgba(0,0,0,0.45)] break-words">
                    {perfil.nome ?? "Atleta"}
                  </h1>
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="inline-flex items-center rounded-full border border-white/35 bg-black/35 px-1.5 py-px text-[8px] font-black uppercase tracking-[0.1em] text-white shadow-[0_1px_5px_rgba(0,0,0,0.35)]">
                      {perfil.tipo_usuario === "organizador" ? "Organizador" : "Atleta"}
                    </span>
                    {hasProfessor ? (
                      <span className="inline-flex items-center rounded-full border border-white/35 bg-black/35 px-1.5 py-px text-[8px] font-black uppercase tracking-[0.1em] text-white shadow-[0_1px_5px_rgba(0,0,0,0.35)]">
                        Professor
                      </span>
                    ) : null}
                    {hasOrganizador ? (
                      <span className="inline-flex items-center rounded-full border border-white/35 bg-black/35 px-1.5 py-px text-[8px] font-black uppercase tracking-[0.1em] text-white shadow-[0_1px_5px_rgba(0,0,0,0.35)]">
                        Organizador
                      </span>
                    ) : null}
                    {hasEspaco ? (
                      <span className="inline-flex items-center rounded-full border border-white/35 bg-black/35 px-1.5 py-px text-[8px] font-black uppercase tracking-[0.1em] text-white shadow-[0_1px_5px_rgba(0,0,0,0.35)]">
                        Espaço
                      </span>
                    ) : null}
                  </div>
                </div>
                {perfil.username || perfil.localizacao ? (
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px]">
                    {perfil.username ? (
                      <p className="font-semibold text-eid-primary-400">@{perfil.username}</p>
                    ) : null}
                    {perfil.username && perfil.localizacao ? (
                      <span
                        className="h-2.5 w-px rounded-full bg-[color:color-mix(in_srgb,var(--eid-primary-500)_32%,var(--eid-border-subtle)_68%)]"
                        aria-hidden
                      />
                    ) : null}
                    {perfil.localizacao ? (
                      <p className="inline-flex items-center gap-1 rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-1.5 py-px text-eid-text-secondary">
                        <svg viewBox="0 0 16 16" fill="currentColor" className="h-2.5 w-2.5 shrink-0 text-eid-action-500/90">
                          <path fillRule="evenodd" d="M8 1.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9ZM2 6a6 6 0 1 1 10.95 3.396l-3.535 5.142a1.5 1.5 0 0 1-2.83 0L2.95 9.396A5.972 5.972 0 0 1 2 6Zm6 2a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" clipRule="evenodd" />
                        </svg>
                        {perfil.localizacao}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            {/* Bio */}
            {perfil.bio ? (
              <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-eid-text-secondary">{perfil.bio}</p>
            ) : null}

            {/* Stats bar */}
            <div className="eid-list-item mt-3 grid grid-cols-4 divide-x divide-[color:var(--eid-border-subtle)] rounded-xl bg-eid-surface/45 text-center">
              <div className="py-2">
                <p className="text-sm font-black text-eid-fg">{vitT}</p>
                <p className="text-[9px] font-bold uppercase tracking-wider text-eid-text-secondary">Vitórias</p>
              </div>
              <div className="py-2">
                <p className="text-sm font-black text-eid-fg">{derT}</p>
                <p className="text-[9px] font-bold uppercase tracking-wider text-eid-text-secondary">Derrotas</p>
              </div>
              <div className="py-2">
                <p className="text-sm font-black text-eid-action-500">{winRate != null ? `${winRate}%` : "—"}</p>
                <p className="text-[9px] font-bold uppercase tracking-wider text-eid-text-secondary">Win Rate</p>
              </div>
              <div className="py-2">
                <p className="text-sm font-black text-eid-primary-400">{jogosT}</p>
                <p className="text-[9px] font-bold uppercase tracking-wider text-eid-text-secondary">Jogos</p>
              </div>
            </div>

            {/* Ficha técnica — sem tempo_experiencia (fica nos cards EID por esporte) */}
            <div className="mt-2 flex flex-nowrap items-center gap-x-2 overflow-x-auto pb-0.5">
              {perfil.altura_cm ? (
                <p className="shrink-0 whitespace-nowrap text-[9px] text-eid-text-secondary">
                  Altura <span className="font-semibold text-eid-fg">{perfil.altura_cm} cm</span>
                </p>
              ) : null}
              {perfil.peso_kg ? (
                <p className="shrink-0 whitespace-nowrap text-[9px] text-eid-text-secondary">
                  Peso <span className="font-semibold text-eid-fg">{perfil.peso_kg} kg</span>
                </p>
              ) : null}
              {perfil.lado ? (
                <p className="shrink-0 whitespace-nowrap text-[9px] text-eid-text-secondary">
                  Lado <span className="font-semibold text-eid-fg">{perfil.lado}</span>
                </p>
              ) : null}
              <div className="ml-auto inline-flex shrink-0 items-center whitespace-nowrap">
                <span className="mr-1 text-[9px] text-eid-text-secondary">Amistoso</span>
                <ProfileFriendlyStatusToggle
                  userId={id}
                  initialOn={amistosoPerfilOn}
                  initialExpiresAt={amistosoPerfilExpiresAt}
                  canToggle={isSelf}
                />
              </div>
              {perfil.estilo_jogo ? (
                <p className="shrink-0 whitespace-nowrap text-[9px] text-eid-text-secondary">
                  Estilo <span className="font-semibold text-eid-fg">{perfil.estilo_jogo}</span>
                </p>
              ) : null}
            </div>

            {/* ── Selos de conquista — prova social imediata ── */}
            {conquistas.length > 0 && (() => {
              const cfg: Record<string, { icon: string; color: string; glow: string }> = {
                "EID Elite":      { icon: "👑", color: "#f59e0b", glow: "rgba(245,158,11,0.18)" },
                "Top 10":         { icon: "🥇", color: "#f97316", glow: "rgba(249,115,22,0.18)" },
                "Winrate 60%+":   { icon: "⚡", color: "#22c55e", glow: "rgba(34,197,94,0.18)"  },
                "Multi-esporte":  { icon: "🎯", color: "#3b82f6", glow: "rgba(59,130,246,0.18)" },
              };
              return (
                <div className="mt-3">
                  <p className="mb-1.5 text-[8px] font-bold uppercase tracking-widest text-eid-text-secondary">
                    Conquistas
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {conquistas.map((nome) => {
                      const b = cfg[nome] ?? { icon: "🏅", color: "#6366f1", glow: "rgba(99,102,241,0.18)" };
                      return (
                        <span
                          key={nome}
                          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wide"
                          style={{
                            background: b.glow,
                            color: b.color,
                            border: `1px solid ${b.color}50`,
                            boxShadow: `0 0 8px ${b.glow}`,
                          }}
                        >
                          <span>{b.icon}</span>
                          {nome}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        <div className="mt-4 grid gap-4">
          {isSelf ? <MatchIdadeGateBanner gate={viewerMatchIdadeGate} /> : null}
          {/* ── Ação principal ──────────────────────────────────────── */}
          <section>
            <h2 className="sr-only">Ação principal</h2>
            {!isSelf && primeiroEsporte ? (
              linkWpp || esportesParaDesafio.length > 0 ? (
                <div className="grid gap-3">
                  {linkWpp ? (
                    <a
                      href={linkWpp}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 text-[13px] font-black uppercase tracking-[0.1em] text-white shadow-[0_0_18px_rgba(37,211,102,0.45)] transition hover:bg-[#1da851]"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.534 5.853L.054 23.25a.75.75 0 0 0 .916.916l5.396-1.479A11.953 11.953 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.986 0-3.84-.552-5.418-1.51l-.388-.232-4.021 1.1 1.1-4.022-.232-.388A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                      Chamar no WhatsApp
                    </a>
                  ) : null}
                  {esportesParaDesafio.length > 0 ? (
                    <ProfileSolicitarMatchMenu
                      alvoId={id}
                      esportes={esportesParaDesafio.map((e) => ({ esporteId: e.esporteId, nome: e.nome }))}
                      viewerAmistosoOn={viewerAmistosoOn}
                      alvoAmistosoOn={amistosoPerfilOn}
                      mostrarDicaWppRanking={Boolean(linkWpp)}
                    />
                  ) : null}
                </div>
              ) : null
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {!isSelf ? <ProfilePrimaryCta href="/match" className="col-span-2" /> : null}
                {hasProfessor ? (
                  <Link
                    href={`/professor/${id}`}
                    className="eid-btn-soft col-span-2 inline-flex min-h-[36px] items-center justify-center rounded-xl border-eid-action-500/30 px-3 text-[11px] font-bold uppercase tracking-wide text-eid-action-400"
                  >
                    Ver perfil profissional
                  </Link>
                ) : null}
              </div>
            )}
          </section>

          {!isSelf ? <ProfileDenunciarButton alvoUsuarioId={id} /> : null}

          {!isSelf && alvoSemFormacao ? (
            <ProfileSection title="Dupla ou time">
              <ProfileConviteFormacaoCta
                targetUserId={id}
                targetNome={perfil.nome ?? "Atleta"}
                targetHasEsportes={(eids ?? []).length > 0}
                eligibleTeams={eligibleTeamsConvite}
                viewerHasAnyLiderTeam={minhasFormacoesLider.length > 0}
                perfilPath={`/perfil/${id}`}
              />
            </ProfileSection>
          ) : null}

          {hasProfessor ? (
            <ProfileSection title="Professor">
              <div className="space-y-3">
                <div className="eid-list-item rounded-xl border-eid-action-500/24 bg-eid-action-500/8 p-4">
                  <p className="text-sm font-semibold text-eid-fg">
                    {professorPerfil?.headline ?? "Professor ativo na plataforma"}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-eid-text-secondary">
                    {professorPerfil?.bio_profissional ?? "Use o perfil profissional para divulgar aulas, treinamento e consultoria."}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full border border-[color:var(--eid-border-subtle)] px-3 py-1 text-[10px] font-semibold text-eid-fg">
                      {professorPerfil?.aceita_novos_alunos ? "Aceitando novos alunos" : "Captação sob consulta"}
                    </span>
                    {professorPerfil?.perfil_publicado ? (
                      <Link href={`/professor/${id}`} className="rounded-full border border-eid-action-500/35 px-3 py-1 text-[10px] font-semibold text-eid-action-400">
                        Abrir página pública
                      </Link>
                    ) : null}
                  </div>
                </div>

                {(professorEsportes ?? []).length ? (
                  <div className="grid gap-2">
                    {(professorEsportes ?? []).map((item, idx) => {
                      const esporte = Array.isArray(item.esportes) ? item.esportes[0] : item.esportes;
                      const metrica = (professorMetricas ?? []).find((m) => {
                        const esporteM = Array.isArray(m.esportes) ? m.esportes[0] : m.esportes;
                        return esporteM?.nome === esporte?.nome;
                      });
                      return (
                        <div key={`${esporte?.nome ?? "esp"}-${idx}`} className="eid-list-item rounded-xl bg-eid-surface/45 p-3">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-eid-fg">{esporte?.nome ?? "Esporte"}</p>
                              <p className="mt-1 text-xs text-eid-text-secondary">
                                {(item.tipo_atuacao ?? []).join(", ") || "aulas"}
                              </p>
                            </div>
                            <p className="text-xs font-bold text-eid-action-400">
                              A partir de R$ {(Number(item.valor_base_centavos ?? 0) / 100).toFixed(2).replace(".", ",")}
                            </p>
                          </div>
                          {metrica ? (
                            <p className="mt-2 text-xs text-eid-text-secondary">
                              Nota docente {Number(metrica.nota_docente ?? 0).toFixed(2)} · {metrica.total_avaliacoes_validas ?? 0} avaliações
                            </p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </ProfileSection>
          ) : null}

          {/* ── Performance EID ─────────────────────────────────────── */}
          <div className="-mt-3">
            {isSelf ? (
              <div className="-mb-5 mt-0 flex justify-end">
                <ProfileEditDrawerTrigger
                  href={`/editar/performance-eid?from=${encodeURIComponent(`/perfil/${id}`)}`}
                  title="Editar Performance EID"
                  topMode="backOnly"
                  className="inline-flex items-center justify-center gap-1 p-0 text-[7px] font-bold uppercase leading-none tracking-[0.08em] text-eid-text-secondary transition-colors hover:text-eid-fg"
                >
                  <svg viewBox="0 0 16 16" fill="currentColor" className="h-2.5 w-2.5" aria-hidden>
                    <path d="M11.875 1.625a1.768 1.768 0 0 1 2.5 2.5l-7.54 7.54a1 1 0 0 1-.46.262l-3.018.805a.5.5 0 0 1-.612-.612l.805-3.018a1 1 0 0 1 .262-.46l7.54-7.54Zm1.793 1.207a.768.768 0 0 0-1.086 0l-.812.812 1.086 1.086.812-.812a.768.768 0 0 0 0-1.086ZM11.149 5.29 4.314 12.126l-1.02.272.272-1.02L10.4 4.544l.75.75Z" />
                  </svg>
                  GERENCIAR / EDITAR
                </ProfileEditDrawerTrigger>
              </div>
            ) : null}
            <ProfileSection title="Performance EID">
              {/* Grid de cards compactos: 3 por linha, clicáveis para stats do esporte */}
              <div className="eid-list-item mt-2 rounded-xl bg-eid-card/55 p-2">
                {(eids ?? []).length === 0 ? (
                  <p className="w-full rounded-xl bg-eid-surface/45 p-3 text-[11px] text-eid-text-secondary">
                    Ainda sem EID registrado por esporte.
                  </p>
                ) : (
                  <div className="flex snap-x gap-2 overflow-x-auto pb-1">
                    {(eids ?? []).map((e, idx) => {
                      const esp = Array.isArray(e.esportes) ? e.esportes[0] : e.esportes;
                      const eid = Number(e.nota_eid ?? 0);

                      return (
                        <ProfileEditDrawerTrigger
                          key={`${e.esporte_id}-${idx}`}
                          href={`/perfil/${encodeURIComponent(id)}/eid/${e.esporte_id}?from=${encodeURIComponent(`/perfil/${id}`)}`}
                          title={`Estatística de ${esp?.nome ?? "esporte"}`}
                          fullscreen
                          topMode="backOnly"
                          className="relative flex min-h-[42px] min-w-[108px] snap-start touch-manipulation flex-col items-center justify-center gap-0.5 rounded-xl bg-eid-surface/45 px-1 py-1 transition-all duration-200 ease-out motion-safe:transform-gpu hover:-translate-y-[1px] hover:bg-eid-surface/60 active:translate-y-0 active:scale-[0.98]"
                        >
                          <div className="inline-flex items-center rounded-full border border-eid-primary-500/45 text-[10px] font-black uppercase leading-none text-white shadow-[0_1px_3px_rgba(0,0,0,0.2)]">
                            <span className="rounded-l-full bg-black px-[7px] py-px">EID</span>
                            <span className="rounded-r-full bg-eid-primary-500 px-[7px] py-px tabular-nums">
                              {eid.toFixed(1)}
                            </span>
                          </div>
                          <span className="line-clamp-1 text-center text-[8px] font-black uppercase tracking-[0.09em] text-eid-fg">
                            {esp?.nome ?? "—"}
                          </span>
                        </ProfileEditDrawerTrigger>
                      );
                    })}
                  </div>
                )}
              </div>
            </ProfileSection>
          </div>

          {/* ── Equipes (omitida para visitante sem formação: bloco "Dupla ou time" acima) ── */}
          {ocultarSecaoEquipesParaVisitante ? null : (
            <div className="mt-2">
              {isSelf ? (
                <div className="-mb-5 mt-0 flex justify-end">
                  <ProfileEditDrawerTrigger
                    href={`/editar/equipes?from=${encodeURIComponent(`/perfil/${id}`)}`}
                    title="Editar equipes"
                    topMode="backOnly"
                    className="inline-flex items-center justify-center gap-1 p-0 text-[7px] font-bold uppercase leading-none tracking-[0.08em] text-eid-text-secondary transition-colors hover:text-eid-fg"
                  >
                    <svg viewBox="0 0 16 16" fill="currentColor" className="h-2.5 w-2.5" aria-hidden>
                      <path d="M11.875 1.625a1.768 1.768 0 0 1 2.5 2.5l-7.54 7.54a1 1 0 0 1-.46.262l-3.018.805a.5.5 0 0 1-.612-.612l.805-3.018a1 1 0 0 1 .262-.46l7.54-7.54Zm1.793 1.207a.768.768 0 0 0-1.086 0l-.812.812 1.086 1.086.812-.812a.768.768 0 0 0 0-1.086ZM11.149 5.29 4.314 12.126l-1.02.272.272-1.02L10.4 4.544l.75.75Z" />
                    </svg>
                    GERENCIAR / EDITAR
                  </ProfileEditDrawerTrigger>
                </div>
              ) : null}
              <ProfileSection title="Equipes">
                {(timesLider ?? []).length > 0 || (duplasCadastro ?? []).length > 0 ? (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {(timesLider ?? []).map((t) => {
                      const esp = Array.isArray(t.esportes) ? t.esportes[0] : t.esportes;
                      const initials = (t.nome?.trim().slice(0, 2) || "EQ").toUpperCase();
                      return (
                        <Link
                          key={`t-${t.id}`}
                          href={`/perfil-time/${t.id}?from=/perfil/${id}`}
                          className="eid-list-item flex items-center gap-2 rounded-xl bg-eid-card/55 p-2 transition-all duration-200 ease-out hover:-translate-y-[1px] hover:border-eid-primary-500/30"
                          aria-label={`Abrir perfil da equipe ${t.nome}`}
                        >
                          {t.escudo ? (
                            <img src={t.escudo} alt="" className="h-10 w-10 shrink-0 rounded-full border border-[color:var(--eid-border-subtle)] object-cover" />
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface text-[10px] font-black text-eid-primary-300">
                              {initials}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-[11px] font-bold text-eid-fg">{t.nome}</p>
                            <p className="truncate text-[9px] text-eid-text-secondary">{`${(t.tipo ?? "time").toUpperCase()} · ${esp?.nome ?? "Esporte"}`}</p>
                          </div>
                        </Link>
                      );
                    })}
                    {(duplasCadastro ?? []).map((d) => {
                      const esp = Array.isArray(d.esportes) ? d.esportes[0] : d.esportes;
                      return (
                        <Link
                          key={`d-${d.id}`}
                          href={`/perfil-dupla/${d.id}?from=/perfil/${id}`}
                          className="eid-list-item flex items-center gap-2 rounded-xl bg-eid-card/55 p-2 transition-all duration-200 ease-out hover:-translate-y-[1px] hover:border-eid-primary-500/30"
                          aria-label={`Abrir perfil da dupla ${d.id}`}
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface text-[10px] font-black text-eid-primary-300">
                            D{d.id}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[11px] font-bold text-eid-fg">{`Dupla #${d.id}`}</p>
                            <p className="truncate text-[9px] text-eid-text-secondary">{esp?.nome ?? "Esporte"}</p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <ProfileEditDrawerTrigger
                    href={`/editar/equipes/cadastrar?from=${encodeURIComponent(`/perfil/${id}`)}`}
                    title="Cadastrar equipe"
                    fullscreen
                    topMode="backOnly"
                    className="eid-list-item mt-2 flex w-full min-h-[84px] flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-eid-primary-500/35 bg-eid-primary-500/[0.06] p-3 text-center transition-all duration-200 ease-out hover:-translate-y-[1px] hover:bg-eid-primary-500/[0.1]"
                  >
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-eid-primary-500/35 bg-eid-surface/65 text-eid-primary-300">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden>
                        <path d="M10 2a.75.75 0 0 1 .75.75v6.5h6.5a.75.75 0 0 1 0 1.5h-6.5v6.5a.75.75 0 0 1-1.5 0v-6.5h-6.5a.75.75 0 0 1 0-1.5h6.5v-6.5A.75.75 0 0 1 10 2Z" />
                      </svg>
                    </span>
                    <p className="text-[11px] font-bold text-eid-fg">Nenhuma equipe cadastrada</p>
                    <p className="text-[9px] text-eid-text-secondary">Toque para cadastrar equipe</p>
                  </ProfileEditDrawerTrigger>
                )}
              </ProfileSection>
            </div>
          )}

          {/* ── Sócio e Frequência ───────────────────────────────────── */}
          {(socioRows ?? []).length > 0 || (frequentesRows ?? []).length > 0 ? (
            <ProfileSection title="Locais">
              {(socioRows ?? []).length > 0 ? (
                <div className="mt-2">
                  <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-eid-text-secondary">Sócio</p>
                  <ul className="grid gap-1.5">
                    {(socioRows ?? []).map((s, idx) => {
                      const esp = Array.isArray(s.espacos_genericos) ? s.espacos_genericos[0] : s.espacos_genericos;
                      return (
                        <li key={`${s.espaco_generico_id}-${idx}`}>
                          <Link href={`/local/${esp?.id}?from=/perfil/${id}`} className="flex items-center justify-between rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-card px-3 py-2 text-[11px] text-eid-fg transition hover:border-eid-primary-500/30">
                            <span className="font-medium">{esp?.nome_publico ?? "Local"}</span>
                            <span className="text-[10px] text-eid-text-secondary">{esp?.localizacao ?? "—"}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
              {(frequentesRows ?? []).length > 0 ? (
                <div className="mt-3">
                  <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-eid-text-secondary">Onde jogo</p>
                  <ul className="grid gap-1.5">
                    {(frequentesRows ?? []).map((f, idx) => {
                      const esp = Array.isArray(f.espacos_genericos) ? f.espacos_genericos[0] : f.espacos_genericos;
                      return (
                        <li key={`${esp?.id}-${idx}`}>
                          <Link
                            href={`/local/${esp?.id}?from=/perfil/${id}`}
                            className="flex items-center justify-between rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-card px-3 py-2 text-[11px] transition hover:border-eid-primary-500/30"
                          >
                            <span className="font-medium text-eid-fg">{esp?.nome_publico ?? "Local"}</span>
                            <span className="font-bold text-eid-primary-300">{f.visitas ?? 0}×</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
            </ProfileSection>
          ) : null}

          {/* ── Histórico ────────────────────────────────────────────── */}
          <div className="mt-0">
            {isSelf ? (
              <div className="-mb-5 mt-0 flex justify-end">
                <ProfileEditDrawerTrigger
                  href={`/editar/historico?from=${encodeURIComponent(`/perfil/${id}`)}`}
                  title="Privacidade do histórico"
                  topMode="backOnly"
                  className="relative top-0.5 inline-flex items-center justify-center gap-1 p-0 text-[7px] font-bold uppercase leading-none tracking-[0.08em] text-eid-text-secondary transition-colors hover:text-eid-fg"
                >
                  <svg viewBox="0 0 16 16" fill="currentColor" className="h-2.5 w-2.5" aria-hidden>
                    <path d="M10.5 1a.75.75 0 0 1 0 1.5H5.25A2.75 2.75 0 0 0 2.5 5.25v5.5A2.75 2.75 0 0 0 5.25 13.5h5.5a2.75 2.75 0 0 0 2.75-2.75V5.5a.75.75 0 0 1 1.5 0v5.25A4.25 4.25 0 0 1 10.75 15h-5.5A4.25 4.25 0 0 1 1 10.75v-5.5A4.25 4.25 0 0 1 5.25 1h5.25Zm2.28.22a.75.75 0 0 1 1.06 0l1.94 1.94a.75.75 0 0 1 0 1.06l-5.47 5.47a.75.75 0 0 1-.33.2l-2.4.66a.75.75 0 0 1-.92-.92l.66-2.4a.75.75 0 0 1 .2-.33l5.47-5.47Z" />
                  </svg>
                  {mostrarHistoricoPublico ? "OCULTAR HISTÓRICO" : "MOSTRAR HISTÓRICO"}
                </ProfileEditDrawerTrigger>
              </div>
            ) : null}
            {podeVerHistorico ? (
              <ProfileSection title="Histórico">
                {partidasHistorico.length > 0 ? (
                  <>
                    <div className="mt-2 grid grid-cols-5 gap-1.5">
                      <div className="rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-1.5 py-1 text-center">
                        <p className="text-[11px] font-black text-emerald-300">{historicoTotais.vitorias}</p>
                        <p className="text-[8px] font-semibold uppercase text-eid-text-secondary">V</p>
                      </div>
                      <div className="rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-1.5 py-1 text-center">
                        <p className="text-[11px] font-black text-red-300">{historicoTotais.derrotas}</p>
                        <p className="text-[8px] font-semibold uppercase text-eid-text-secondary">D</p>
                      </div>
                      <div className="rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-1.5 py-1 text-center">
                        <p className="text-[11px] font-black text-eid-primary-300">{historicoTotais.empates}</p>
                        <p className="text-[8px] font-semibold uppercase text-eid-text-secondary">E</p>
                      </div>
                      <div className="rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-1.5 py-1 text-center">
                        <p className="text-[11px] font-black text-eid-fg">{historicoTotais.rank}</p>
                        <p className="text-[8px] font-semibold uppercase text-eid-text-secondary">Rank</p>
                      </div>
                      <div className="rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-1.5 py-1 text-center">
                        <p className="text-[11px] font-black text-eid-fg">{historicoTotais.torneio}</p>
                        <p className="text-[8px] font-semibold uppercase text-eid-text-secondary">Torneio</p>
                      </div>
                    </div>
                    <ul className="mt-2 grid gap-1.5">
                      {resumoHistorico.map((item) => (
                        <li
                          key={item.id}
                            className={`flex items-center justify-between rounded-lg border bg-eid-surface/45 px-2 py-1.5 text-[10px] ${
                            item.tone === "positive"
                              ? "border-emerald-400/30"
                              : item.tone === "negative"
                                ? "border-red-400/30"
                                : "border-[color:var(--eid-border-subtle)]"
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-black text-eid-fg">{item.resultado}</span>
                            <span className="font-semibold text-eid-text-secondary">{item.origem}</span>
                            <span className="font-bold text-eid-fg">{item.placar}</span>
                          </div>
                          <span className="text-[9px] text-eid-text-secondary">{item.dataFmt}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-2 flex justify-end">
                      <ProfileEditDrawerTrigger
                        href={`/perfil/${id}/historico?from=${encodeURIComponent(`/perfil/${id}`)}`}
                        title="Histórico completo"
                        fullscreen
                        topMode="backOnly"
                        className="inline-flex items-center justify-center gap-1 p-0 text-[7px] font-bold uppercase leading-none tracking-[0.08em] text-eid-text-secondary transition-colors hover:text-eid-fg"
                      >
                        <svg viewBox="0 0 16 16" fill="currentColor" className="h-2.5 w-2.5" aria-hidden>
                          <path d="M8 1.5a.75.75 0 0 1 .75.75V8h4.5a.75.75 0 0 1 0 1.5H8A.75.75 0 0 1 7.25 8V2.25A.75.75 0 0 1 8 1.5Zm0 13a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Zm-8-6.5a8 8 0 1 1 16 0 8 8 0 0 1-16 0Z" />
                        </svg>
                        VER HISTÓRICO COMPLETO
                      </ProfileEditDrawerTrigger>
                    </div>
                  </>
                ) : (
                  <ProfileEditDrawerTrigger
                    href={`/perfil/${id}/historico?from=${encodeURIComponent(`/perfil/${id}`)}`}
                    title="Histórico completo"
                    fullscreen
                    topMode="backOnly"
                    className="eid-list-item mt-2 flex w-full min-h-[84px] flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-eid-primary-500/35 bg-eid-primary-500/[0.06] p-3 text-center transition-all duration-200 ease-out hover:-translate-y-[1px] hover:bg-eid-primary-500/[0.1]"
                  >
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-eid-primary-500/35 bg-eid-surface/65 text-eid-primary-300">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden>
                        <path d="M10 2.25a.75.75 0 0 1 .75.75V10h4.25a.75.75 0 0 1 0 1.5H10A.75.75 0 0 1 9.25 10V3a.75.75 0 0 1 .75-.75Zm0 15a7.25 7.25 0 1 0 0-14.5 7.25 7.25 0 0 0 0 14.5ZM1.25 10a8.75 8.75 0 1 1 17.5 0 8.75 8.75 0 0 1-17.5 0Z" />
                      </svg>
                    </span>
                    <p className="text-[11px] font-bold text-eid-fg">Nenhum histórico registrado ainda</p>
                    <p className="text-[9px] text-eid-text-secondary">Toque para ver o histórico completo.</p>
                  </ProfileEditDrawerTrigger>
                )}
              </ProfileSection>
            ) : (
              <ProfileSection title="Histórico">
                <div className="eid-list-item mt-2 rounded-xl bg-eid-card/55 p-3 text-center">
                  <p className="text-[11px] font-bold text-eid-fg">Histórico privado</p>
                  <p className="mt-0.5 text-[9px] text-eid-text-secondary">Este usuário optou por não exibir o histórico no perfil público.</p>
                </div>
              </ProfileSection>
            )}
          </div>
        </div>
      </main>
  );
}
