import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EidBadge } from "@/components/eid/eid-badge";
import { PerfilBackLink } from "@/components/perfil/perfil-back-link";
import { ProfileCompactTimeline } from "@/components/perfil/profile-history-widgets";
import { ProfilePrimaryCta, ProfileSection } from "@/components/perfil/profile-layout-blocks";
import { ProfileTeamCard } from "@/components/perfil/profile-team-members-cards";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { resolveBackHref } from "@/lib/perfil/back-href";
import {
  esporteIdsComMatchAceitoEntre,
  podeExibirWhatsappProfessor,
  podeExibirWhatsappPerfilPublico,
  waMeHref,
} from "@/lib/perfil/whatsapp-visibility";
import { loginNextWithOptionalFrom } from "@/lib/auth/login-next-path";
import { CONTA_ESPORTES_EID_HREF, CONTA_PERFIL_HREF } from "@/lib/routes/conta";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ from?: string }>;
};

export default async function PerfilPublicoPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = (await searchParams) ?? {};
  const backHref = resolveBackHref(sp.from, "/match");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(loginNextWithOptionalFrom(`/perfil/${id}`, sp));

  const { data: perfil } = await supabase
    .from("profiles")
    .select(
      "id, nome, username, avatar_url, whatsapp, localizacao, altura_cm, peso_kg, lado, foto_capa, tipo_usuario, genero, tempo_experiencia, interesse_rank_match, interesse_torneio, disponivel_amistoso, estilo_jogo, bio"
    )
    .eq("id", id)
    .maybeSingle();
  if (!perfil) notFound();

  const isSelf = user.id === id;

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

  const { data: eidLogs } = await supabase
    .from("eid_logs")
    .select("change_amount, reason, created_at, esportes(nome)")
    .eq("entity_kind", "usuario")
    .eq("entity_profile_id", id)
    .order("created_at", { ascending: false })
    .limit(3);

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

  const primeiroEsporte = eids?.[0]?.esporte_id;
  const esportesDoPerfil = (eids ?? [])
    .map((e) => ({
      esporteId: Number(e.esporte_id),
      nome: (Array.isArray(e.esportes) ? e.esportes[0] : e.esportes)?.nome ?? "Esporte",
    }))
    .filter((e) => Number.isFinite(e.esporteId) && e.esporteId > 0);
  const esportesParaDesafio = esportesDoPerfil.filter((e) => !esportesMatchAceito.has(e.esporteId));
  const maisDeUmDesafio = esportesParaDesafio.length > 1;

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

  const { data: partidasRecentes } = await supabase
    .from("partidas")
    .select("id, jogador1_id, jogador2_id, placar_1, placar_2, status, data_resultado, data_registro")
    .or(`jogador1_id.eq.${id},jogador2_id.eq.${id}`)
    .order("data_registro", { ascending: false })
    .limit(8);

  const timeline = (partidasRecentes ?? []).map((p) => {
    const isP1 = p.jogador1_id === id;
    const isP2 = p.jogador2_id === id;
    let resultado: "V" | "D" | "—" = "—";
    if (Number.isFinite(Number(p.placar_1)) && Number.isFinite(Number(p.placar_2))) {
      const s1 = Number(p.placar_1 ?? 0);
      const s2 = Number(p.placar_2 ?? 0);
      if (isP1) resultado = s1 > s2 ? "V" : s1 < s2 ? "D" : "—";
      if (isP2) resultado = s2 > s1 ? "V" : s2 < s1 ? "D" : "—";
    }
    return { id: p.id, resultado, data: p.data_resultado ?? p.data_registro };
  });

  const conquistas: string[] = [];
  if ((eids ?? []).length >= 3) conquistas.push("Multi-esporte");
  if ((winRate ?? 0) >= 60 && jogosT >= 10) conquistas.push("Winrate 60%+");
  if ((principalEid?.posicao_rank ?? 9999) <= 10) conquistas.push("Top 10");
  if ((principalEid?.nota_eid ?? 0) >= 7) conquistas.push("EID Elite");

  return (
    <>
      <DashboardTopbar />
      <main className="mx-auto w-full max-w-lg px-2.5 pb-6 pt-2 sm:max-w-2xl sm:px-5 sm:pb-8 sm:pt-3">
        <PerfilBackLink href={backHref} label="Voltar" />

        {/* ── Hero Card ─────────────────────────────────────────────── */}
        {/* ── Hero Card ──
             overflow-hidden no container clipa tudo dentro dos cantos arredondados.
             O avatar fica na frente da capa via z-10 (elementos com z-index > 0
             sobrepõem elementos sem z-index dentro do mesmo contexto).
        */}
        <div className="relative mt-2 overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card shadow-[0_4px_24px_rgba(0,0,0,0.3)]">

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

            {/* Avatar + Nome lado a lado, alinhados pela base */}
            <div className="-mt-10 flex items-end gap-3">
              {perfil.avatar_url ? (
                <img
                  src={perfil.avatar_url}
                  alt=""
                  className="relative z-10 h-[68px] w-[68px] shrink-0 rounded-xl border-[3px] border-eid-card object-cover shadow-[0_0_0_2px_rgba(249,115,22,0.55),0_6px_20px_rgba(0,0,0,0.5)]"
                />
              ) : (
                <div className="relative z-10 flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-xl border-[3px] border-eid-card bg-gradient-to-br from-eid-primary-700 to-eid-primary-900 text-sm font-black tracking-widest text-eid-primary-200 shadow-[0_0_0_2px_rgba(249,115,22,0.55),0_6px_20px_rgba(0,0,0,0.5)]">
                  EID
                </div>
              )}
              {/* Nome alinhado ao fundo do avatar — 1 linha ~20px, sempre abaixo da capa */}
              <div className="min-w-0 flex-1 pb-1">
                <h1 className="text-[13px] font-black tracking-tight text-eid-fg leading-tight break-words">
                  {perfil.nome ?? "Atleta"}
                </h1>
                {perfil.username ? (
                  <p className="mt-0.5 text-[10px] font-semibold text-eid-primary-400">@{perfil.username}</p>
                ) : null}
              </div>
            </div>

            {/* Badges de papel / interesse — logo abaixo do nome */}
            <div className="mt-2 flex flex-wrap gap-1">
              <span className="rounded border border-eid-primary-500/30 bg-eid-primary-500/10 px-1.5 py-px text-[9px] font-bold uppercase tracking-wider text-eid-primary-500">
                {perfil.tipo_usuario === "organizador" ? "Org" : "Atleta"}
              </span>
              {hasProfessor ? (
                <span className="rounded border border-eid-action-500/35 bg-eid-action-500/10 px-1.5 py-px text-[9px] font-bold uppercase tracking-wider text-eid-action-500">
                  Professor
                </span>
              ) : null}
              {perfil.interesse_rank_match !== false && (
                <span className="rounded border border-eid-action-500/35 bg-eid-action-500/10 px-1.5 py-px text-[9px] font-bold uppercase tracking-wider text-eid-action-500">
                  Rank
                </span>
              )}
              {perfil.interesse_torneio !== false && (
                <span className="rounded border border-eid-primary-400/25 bg-eid-primary-400/8 px-1.5 py-px text-[9px] font-bold uppercase tracking-wider text-eid-primary-400">
                  Torneios
                </span>
              )}
              {principalEid ? <EidBadge score={Number(principalEid.nota_eid ?? 0)} history={eidLogs ?? []} /> : null}
            </div>

            {/* Localização */}
            {perfil.localizacao ? (
              <p className="mt-1.5 flex items-center gap-1 text-[11px] text-eid-text-secondary">
                <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3 shrink-0 text-eid-action-500">
                  <path fillRule="evenodd" d="M8 1.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9ZM2 6a6 6 0 1 1 10.95 3.396l-3.535 5.142a1.5 1.5 0 0 1-2.83 0L2.95 9.396A5.972 5.972 0 0 1 2 6Zm6 2a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" clipRule="evenodd" />
                </svg>
                {perfil.localizacao}
              </p>
            ) : null}

            {/* Interesses e estilo de jogo */}
            <div className="mt-2">
              <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-eid-text-secondary">Estou disponível para:</p>
              <div className="flex flex-wrap gap-1">
                <span className="rounded border border-eid-primary-500/20 px-1.5 py-px text-[9px] font-semibold text-eid-primary-400">
                  {perfil.disponivel_amistoso !== false ? "✓ Amistosos" : "✗ Amistosos"}
                </span>
                {perfil.estilo_jogo ? (
                  <span className="rounded border border-[color:var(--eid-border-subtle)] px-1.5 py-px text-[9px] font-semibold text-eid-text-secondary">
                    {perfil.estilo_jogo}
                  </span>
                ) : null}
              </div>
            </div>

            {/* Bio */}
            {perfil.bio ? (
              <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-eid-text-secondary">{perfil.bio}</p>
            ) : null}

            {/* Stats bar */}
            <div className="mt-3 grid grid-cols-4 divide-x divide-[color:var(--eid-border-subtle)] rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 text-center">
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
            {(perfil.altura_cm || perfil.peso_kg || perfil.lado) ? (
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                {perfil.altura_cm ? (
                  <p className="text-[10px] text-eid-text-secondary">
                    Altura <span className="font-semibold text-eid-fg">{perfil.altura_cm} cm</span>
                  </p>
                ) : null}
                {perfil.peso_kg ? (
                  <p className="text-[10px] text-eid-text-secondary">
                    Peso <span className="font-semibold text-eid-fg">{perfil.peso_kg} kg</span>
                  </p>
                ) : null}
                {perfil.lado ? (
                  <p className="text-[10px] text-eid-text-secondary">
                    Lado <span className="font-semibold text-eid-fg">{perfil.lado}</span>
                  </p>
                ) : null}
              </div>
            ) : null}

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
                    maisDeUmDesafio ? (
                      <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-eid-text-secondary">
                          {linkWpp ? "Match no ranking" : "Solicitar Match"}
                        </p>
                        <p className="mt-1 text-xs text-eid-text-secondary">
                          {linkWpp
                            ? "Vocês já podem falar no WhatsApp (ex.: torneio). Para valer pontos no ranking, envie o pedido de match no esporte:"
                            : "Este atleta joga mais de um esporte. Escolha qual esporte você quer desafiar:"}
                        </p>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          {esportesParaDesafio.map((esp) => (
                            <Link
                              key={esp.esporteId}
                              href={`/desafio?id=${encodeURIComponent(id)}&tipo=individual&esporte=${esp.esporteId}`}
                              className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-eid-action-500/35 bg-eid-action-500/10 px-3 text-xs font-bold uppercase tracking-wide text-eid-action-400 transition hover:bg-eid-action-500/15"
                            >
                              {esp.nome}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <ProfilePrimaryCta
                        href={`/desafio?id=${encodeURIComponent(id)}&tipo=individual&esporte=${esportesParaDesafio[0]!.esporteId}`}
                        label={linkWpp ? "⚡ Match no ranking" : undefined}
                      />
                    )
                  ) : null}
                </div>
              ) : null
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {!isSelf ? <ProfilePrimaryCta href="/match" className="col-span-2" /> : null}
                {hasProfessor ? (
                  <Link
                    href={`/professor/${id}`}
                    className="col-span-2 inline-flex min-h-[36px] items-center justify-center rounded-lg border border-eid-action-500/30 px-3 text-[11px] font-bold uppercase tracking-wide text-eid-action-400 transition hover:bg-eid-action-500/8"
                  >
                    Ver perfil profissional
                  </Link>
                ) : null}
                <Link
                  href="/times?create=1"
                  className={`${isSelf && !hasProfessor ? "col-span-2" : ""} inline-flex min-h-[36px] items-center justify-center rounded-lg border border-eid-action-500/30 px-3 text-[11px] font-bold uppercase tracking-wide text-eid-action-400 transition hover:bg-eid-action-500/8`}
                >
                  Nova Equipe
                </Link>
                {isSelf ? (
                  <Link
                    href={CONTA_PERFIL_HREF}
                    className="inline-flex min-h-[36px] items-center justify-center rounded-lg border border-[color:var(--eid-border-subtle)] px-3 text-[11px] font-bold uppercase tracking-wide text-eid-fg transition hover:border-eid-primary-500/40"
                  >
                    Editar Perfil
                  </Link>
                ) : null}
              </div>
            )}
          </section>

          {hasProfessor ? (
            <ProfileSection title="Professor">
              <div className="space-y-3">
                <div className="rounded-xl border border-eid-action-500/20 bg-eid-action-500/8 p-4">
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
                        <div key={`${esporte?.nome ?? "esp"}-${idx}`} className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 p-3">
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
          <ProfileSection title="Performance EID">
            {isSelf ? (
              <div className="mb-2 mt-1">
                <Link
                  href={CONTA_ESPORTES_EID_HREF}
                  className="inline-flex min-h-[38px] w-full items-center justify-center rounded-xl border border-eid-primary-500/45 bg-eid-primary-500/10 px-3 text-[11px] font-black uppercase tracking-wide text-eid-primary-300 transition hover:border-eid-primary-500/65 hover:bg-eid-primary-500/16 sm:w-auto"
                >
                  Gerenciar / editar
                </Link>
                <p className="mt-1 text-[10px] text-eid-text-secondary">
                  Esportes do ranking, tempo de prática e ficha — mesmo fluxo do cadastro, em modo edição.
                </p>
              </div>
            ) : null}
            {/* Grid de cards compactos: 3 por linha, clicáveis para stats do esporte */}
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(eids ?? []).length === 0 ? (
                <p className="col-span-3 rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-card p-3 text-[11px] text-eid-text-secondary">
                  Ainda sem EID registrado por esporte.
                </p>
              ) : (
                (eids ?? []).map((e, idx) => {
                  const esp = Array.isArray(e.esportes) ? e.esportes[0] : e.esportes;
                  const eid = Number(e.nota_eid ?? 0);
                  const jogos = Number(e.partidas_jogadas ?? 0);
                  const eidHex = eid >= 7 ? "#22c55e" : eid >= 4 ? "#fb923c" : "#60a5fa";
                  const eidGlow = eid >= 7 ? "rgba(34,197,94,0.5)" : eid >= 4 ? "rgba(251,146,60,0.5)" : "rgba(96,165,250,0.45)";

                  return (
                    <Link
                      key={`${e.esporte_id}-${idx}`}
                      href={`/perfil/${encodeURIComponent(id)}/eid/${e.esporte_id}?from=${encodeURIComponent(`/perfil/${id}`)}`}
                      className="flex overflow-hidden rounded-xl border-0 transition hover:scale-[1.03] active:scale-[0.97]"
                      style={{
                        boxShadow: `0 2px 12px ${eidGlow}, 0 0 0 1.5px ${eidHex}60`,
                      }}
                    >
                      {/* Painel esquerdo — cor sólida do nível, texto branco */}
                      <div
                        className="flex w-[36px] shrink-0 flex-col items-center justify-center py-1.5"
                        style={{ background: `linear-gradient(160deg, ${eidHex}ee 0%, ${eidHex}99 100%)` }}
                      >
                        <span className="text-[6px] font-black uppercase tracking-[0.18em] text-white/70">
                          EID
                        </span>
                        <span
                          className="font-black leading-none tabular-nums text-white"
                          style={{ fontSize: 15, textShadow: `0 1px 5px rgba(0,0,0,0.35)` }}
                        >
                          {eid.toFixed(1)}
                        </span>
                      </div>

                      {/* Painel direito */}
                      <div className="flex min-w-0 flex-1 flex-col items-center justify-center bg-eid-card px-1 py-1.5">
                        <span className="line-clamp-1 text-center text-[9px] font-black uppercase tracking-wide text-eid-fg">
                          {esp?.nome ?? "—"}
                        </span>
                        <span className="text-[7px] font-semibold text-eid-text-secondary">
                          {jogos} jogo{jogos !== 1 ? "s" : ""}
                        </span>
                        {e.posicao_rank != null && (
                          <span
                            className="mt-0.5 rounded px-1 py-px text-[6px] font-bold"
                            style={{ background: `${eidHex}20`, color: eidHex }}
                          >
                            #{e.posicao_rank}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </ProfileSection>

          {/* ── Equipes ──────────────────────────────────────────────── */}
          <ProfileSection title="Equipes">
            {(timesLider ?? []).length > 0 || (duplasCadastro ?? []).length > 0 ? (
              <div className="mt-2 flex snap-x gap-2 overflow-x-auto pb-1">
                {(timesLider ?? []).map((t) => {
                  const esp = Array.isArray(t.esportes) ? t.esportes[0] : t.esportes;
                  return (
                    <ProfileTeamCard
                      key={`t-${t.id}`}
                      href={`/perfil-time/${t.id}?from=/perfil/${id}`}
                      imageUrl={t.escudo}
                      title={t.nome}
                      subtitle={`${(t.tipo ?? "time").toUpperCase()} · ${esp?.nome ?? "Esporte"}`}
                    />
                  );
                })}
                {(duplasCadastro ?? []).map((d) => {
                  const esp = Array.isArray(d.esportes) ? d.esportes[0] : d.esportes;
                  return (
                    <ProfileTeamCard
                      key={`d-${d.id}`}
                      href={`/perfil-dupla/${d.id}?from=/perfil/${id}`}
                      title={`Dupla #${d.id}`}
                      subtitle={esp?.nome ?? "Esporte"}
                    />
                  );
                })}
              </div>
            ) : (
              <p className="mt-2 rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-card p-3 text-[11px] text-eid-text-secondary">
                Sem equipes vinculadas no momento.
              </p>
            )}
          </ProfileSection>

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
          <ProfileSection title="Histórico">
            <ProfileCompactTimeline
              title="Timeline V/D"
              emptyText="Sem jogos recentes."
              items={timeline.map((t) => ({
                id: String(t.id),
                label: `${t.resultado} · ${t.data ? new Date(t.data).toLocaleDateString("pt-BR") : "—"}`,
                tone: t.resultado === "V" ? "positive" : t.resultado === "D" ? "negative" : "neutral",
              }))}
            />
          </ProfileSection>
        </div>
      </main>
    </>
  );
}
