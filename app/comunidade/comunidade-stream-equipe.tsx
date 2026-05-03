import Image from "next/image";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Calendar, Clock, Clock3, LayoutGrid, Shield, User, UserPlus } from "lucide-react";
import { ComunidadeConvitesTime, type ConviteTimeItem } from "@/components/comunidade/comunidade-convites-time";
import {
  ComunidadeConvitesEnviadosTime,
  type ConviteTimeEnviadoItem,
} from "@/components/comunidade/comunidade-convites-enviados-time";
import { ComunidadeQuadro } from "@/components/comunidade/comunidade-quadro";
import {
  ComunidadeSugestoesEnviadasMatch,
  type SugestaoEnviadaMatchItem,
} from "@/components/comunidade/comunidade-sugestoes-enviadas-match";
import { ComunidadeSugestoesMatch, type SugestaoMatchItem } from "@/components/comunidade/comunidade-sugestoes-match";
import { ProfileEidPerformanceSeal } from "@/components/perfil/profile-eid-performance-seal";
import { ProfileEditDrawerTrigger } from "@/components/perfil/profile-edit-drawer-trigger";
import { EidCityState } from "@/components/ui/eid-city-state";
import { CancelarCandidaturaForm } from "@/components/vagas/vagas-actions";
import { CandidaturaResponseActions } from "@/components/vagas/candidatura-response-actions";
import {
  EID_SOCIAL_GRID_3,
  EID_SOCIAL_PANEL_FOOTER,
  getSocialStatusPanelItemShell,
  formatSolicitacaoParts,
} from "@/lib/comunidade/social-panel-layout";
import { getMatchRankCooldownMeses } from "@/lib/app-config/match-rank-cooldown";
import { distanciaKm } from "@/lib/geo/distance-km";
import { ModalidadeGlyphIcon, SportGlyphIcon } from "@/lib/perfil/formacao-glyphs";
import { PedidoElencoEidSeal, PedidoElencoLocationLight } from "./comunidade-pedido-elenco-mini";
import { primeiroNome } from "./comunidade-shared";

export type ComunidadeProfileShell = {
  nome: string | null;
  avatar_url: string | null;
  localizacao: string | null;
};

export type ComunidadeStreamEquipeProps = {
  supabase: SupabaseClient;
  viewerUserId: string;
  profile: ComunidadeProfileShell;
  hasMyCoords: boolean;
  myLat: number;
  myLng: number;
};

export async function ComunidadeStreamEquipe({
  supabase,
  viewerUserId,
  profile,
  hasMyCoords,
  myLat,
  myLng,
}: ComunidadeStreamEquipeProps) {
  const [{ data: sugestoesRaw }, { data: sugestoesEnviadasRaw }, cooldownMesesSug] = await Promise.all([
    supabase
      .from("match_sugestoes")
      .select("id, sugeridor_id, sugeridor_time_id, alvo_time_id, esporte_id, modalidade, mensagem, criado_em")
      .eq("alvo_dono_id", viewerUserId)
      .eq("status", "pendente")
      .order("id", { ascending: false })
      .limit(25),
    supabase
      .from("match_sugestoes")
      .select("id, sugeridor_id, sugeridor_time_id, alvo_time_id, esporte_id, modalidade, mensagem, status, criado_em, respondido_em, oculto_sugeridor")
      .eq("sugeridor_id", viewerUserId)
      .neq("oculto_sugeridor", true)
      .order("id", { ascending: false })
      .limit(40),
    getMatchRankCooldownMeses(supabase),
  ]);

  const sugSugIds = [...new Set((sugestoesRaw ?? []).map((s) => s.sugeridor_id).filter(Boolean))] as string[];
  const sugTimeIds = [
    ...new Set(
      (sugestoesRaw ?? []).flatMap((s) => [s.sugeridor_time_id, s.alvo_time_id].filter((x): x is number => x != null)),
    ),
  ];
  const sugEspIds = [...new Set((sugestoesRaw ?? []).map((s) => s.esporte_id).filter(Boolean))] as number[];
  const [{ data: sugPerfis }, { data: sugTimes }, { data: sugEsportes }] = await Promise.all([
    sugSugIds.length
      ? supabase.from("profiles").select("id, nome, avatar_url, localizacao").in("id", sugSugIds)
      : Promise.resolve({ data: [] as Array<{ id: string; nome: string | null; avatar_url: string | null; localizacao: string | null }> }),
    sugTimeIds.length
      ? supabase.from("times").select("id, nome, criador_id, escudo, eid_time, localizacao").in("id", sugTimeIds)
      : Promise.resolve({ data: [] as Array<{ id: number; nome: string | null; criador_id: string | null; escudo: string | null; eid_time: number | null; localizacao: string | null }> }),
    sugEspIds.length
      ? supabase.from("esportes").select("id, nome").in("id", sugEspIds)
      : Promise.resolve({ data: [] as Array<{ id: number; nome: string | null }> }),
  ]);
  const sugPerfilMap = new Map((sugPerfis ?? []).map((p) => [p.id, p.nome]));
  const sugPerfilAvatarMap = new Map(
    (sugPerfis ?? []).map((p) => [p.id, String((p as { avatar_url?: string | null }).avatar_url ?? "")]),
  );
  const sugPerfilLocMap = new Map<string, string | null>(
    (sugPerfis ?? []).map((p) => {
      const loc = String((p as { localizacao?: string | null }).localizacao ?? "").trim();
      return [p.id, loc || null];
    }),
  );
  const sugTimeMap = new Map((sugTimes ?? []).map((t) => [t.id, t.nome]));
  const sugTimeAvatarMap = new Map((sugTimes ?? []).map((t) => [Number(t.id), String((t as { escudo?: string | null }).escudo ?? "")]));
  const sugTimeEidMap = new Map((sugTimes ?? []).map((t) => [Number(t.id), Number((t as { eid_time?: number | null }).eid_time ?? 0)]));
  const sugTimeLocMap = new Map((sugTimes ?? []).map((t) => [Number(t.id), String((t as { localizacao?: string | null }).localizacao ?? "")]));
  const sugTimeOwnerMap = new Map((sugTimes ?? []).map((t) => [Number(t.id), String((t as { criador_id?: string | null }).criador_id ?? "")]));
  const sugEspMap = new Map((sugEsportes ?? []).map((e) => [e.id, e.nome]));

  const cutoffSug = new Date();
  cutoffSug.setMonth(cutoffSug.getMonth() - cooldownMesesSug);
  const cutoffSugMs = cutoffSug.getTime();
  const candidateOwnerIds = [
    ...new Set(
      (sugestoesRaw ?? [])
        .map((s) => {
          const modalidade = String(s.modalidade ?? "").trim().toLowerCase();
          if (modalidade === "individual") return String(s.sugeridor_id ?? "");
          const teamId = Number(s.sugeridor_time_id ?? 0);
          return sugTimeOwnerMap.get(teamId) ?? "";
        })
        .filter(Boolean),
    ),
  ];
  const sugEsporteIdsSet = [...new Set((sugestoesRaw ?? []).map((s) => Number(s.esporte_id ?? 0)).filter((n) => Number.isFinite(n) && n > 0))];
  const { data: partidasSugCooldown } =
    candidateOwnerIds.length && sugEsporteIdsSet.length
      ? await supabase
          .from("partidas")
          .select("esporte_id, modalidade, jogador1_id, jogador2_id, status, status_ranking, data_resultado, data_partida, data_registro")
          .is("torneio_id", null)
          .in("esporte_id", sugEsporteIdsSet)
          .or(`jogador1_id.eq.${viewerUserId},jogador2_id.eq.${viewerUserId}`)
          .order("id", { ascending: false })
          .limit(350)
      : { data: [] as Array<Record<string, unknown>> };
  const blockedSugByKey = new Set<string>();
  const normTxt = (v: string | null | undefined) =>
    String(v ?? "")
      .trim()
      .toLowerCase();
  for (const p of partidasSugCooldown ?? []) {
    const status = normTxt((p as { status?: string | null }).status);
    const statusRanking = normTxt((p as { status_ranking?: string | null }).status_ranking);
    const valid =
      statusRanking === "validado" ||
      ["concluida", "concluída", "concluido", "concluído", "finalizada", "encerrada", "validada"].includes(status);
    if (!valid) continue;
    const dtRaw =
      (p as { data_resultado?: string | null }).data_resultado ??
      (p as { data_partida?: string | null }).data_partida ??
      (p as { data_registro?: string | null }).data_registro ??
      null;
    if (!dtRaw) continue;
    const ts = new Date(dtRaw).getTime();
    if (!Number.isFinite(ts) || ts < cutoffSugMs) continue;
    const j1 = String((p as { jogador1_id?: string | null }).jogador1_id ?? "");
    const j2 = String((p as { jogador2_id?: string | null }).jogador2_id ?? "");
    const otherId = j1 === viewerUserId ? j2 : j2 === viewerUserId ? j1 : "";
    if (!otherId) continue;
    const esporteId = Number((p as { esporte_id?: number | null }).esporte_id ?? 0);
    if (!Number.isFinite(esporteId) || esporteId <= 0) continue;
    const modRaw = normTxt((p as { modalidade?: string | null }).modalidade);
    const modalidade = modRaw === "dupla" ? "dupla" : modRaw === "time" ? "time" : "individual";
    blockedSugByKey.add(`${otherId}:${esporteId}:${modalidade}`);
  }

  const sugestoesItems: SugestaoMatchItem[] = (sugestoesRaw ?? [])
    .filter((s) => {
      const modalidadeRaw = String(s.modalidade ?? "").trim().toLowerCase();
      const modalidade = modalidadeRaw === "dupla" ? "dupla" : modalidadeRaw === "time" ? "time" : "individual";
      const esporteId = Number(s.esporte_id ?? 0);
      const ownerId =
        modalidade === "individual"
          ? String(s.sugeridor_id ?? "")
          : sugTimeOwnerMap.get(Number(s.sugeridor_time_id ?? 0)) ?? "";
      if (!ownerId || !Number.isFinite(esporteId) || esporteId <= 0) return true;
      return !blockedSugByKey.has(`${ownerId}:${esporteId}:${modalidade}`);
    })
    .map((s) => ({
      id: Number(s.id),
      criadoEm: String((s as { criado_em?: string | null }).criado_em ?? "").trim() || null,
      sugeridorId: String(s.sugeridor_id ?? ""),
      sugeridorNome: sugPerfilMap.get(s.sugeridor_id) ?? "Atleta",
      sugeridorAvatarUrl: sugPerfilAvatarMap.get(String(s.sugeridor_id ?? "")) || null,
      sugeridorLocalizacao: sugPerfilLocMap.get(String(s.sugeridor_id ?? "")) ?? null,
      meuTimeId: Number(s.sugeridor_time_id ?? 0) || null,
      meuTimeTipo: String(s.modalidade ?? "time"),
      meuTimeNome: sugTimeMap.get(s.sugeridor_time_id) ?? "Formação",
      meuTimeAvatarUrl: sugTimeAvatarMap.get(Number(s.sugeridor_time_id ?? 0)) || null,
      meuTimeNotaEid: sugTimeEidMap.get(Number(s.sugeridor_time_id ?? 0)) ?? 0,
      meuTimeLocalizacao: sugTimeLocMap.get(Number(s.sugeridor_time_id ?? 0)) || null,
      alvoTimeNome: sugTimeMap.get(s.alvo_time_id) ?? "Formação",
      esporte: (s.esporte_id ? sugEspMap.get(s.esporte_id) : null) ?? "Esporte",
      modalidade: s.modalidade ?? "time",
      mensagem: s.mensagem ?? null,
    }));
  const sugEnvTimeIds = [
    ...new Set(
      (sugestoesEnviadasRaw ?? []).flatMap((s) => [s.sugeridor_time_id, s.alvo_time_id].filter((x): x is number => x != null)),
    ),
  ];
  const sugEnvEspIds = [...new Set((sugestoesEnviadasRaw ?? []).map((s) => Number(s.esporte_id ?? 0)).filter((n) => Number.isFinite(n) && n > 0))];
  const [{ data: sugEnvTimes }, { data: sugEnvEsportes }] = await Promise.all([
    sugEnvTimeIds.length
      ? supabase.from("times").select("id, nome, escudo, eid_time, localizacao").in("id", sugEnvTimeIds)
      : Promise.resolve({ data: [] as Array<{ id: number; nome: string | null; escudo: string | null; eid_time: number | null; localizacao: string | null }> }),
    sugEnvEspIds.length
      ? supabase.from("esportes").select("id, nome").in("id", sugEnvEspIds)
      : Promise.resolve({ data: [] as Array<{ id: number; nome: string | null }> }),
  ]);
  const sugEnvTimesMap = new Map((sugEnvTimes ?? []).map((t) => [Number(t.id), t]));
  const sugEnvEspMap = new Map((sugEnvEsportes ?? []).map((e) => [Number(e.id), String(e.nome ?? "Esporte")]));
  const sugestoesEnviadasItems: SugestaoEnviadaMatchItem[] = (sugestoesEnviadasRaw ?? [])
    .map((s) => {
      const time = sugEnvTimesMap.get(Number(s.sugeridor_time_id ?? 0));
      const statusRaw = String(s.status ?? "pendente").trim().toLowerCase();
      const statusLabel =
        statusRaw === "aprovado" ? "Aprovado" : statusRaw === "recusado" ? "Recusado" : "Pendente";
      const statusClass =
        statusRaw === "aprovado"
          ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-200"
          : statusRaw === "recusado"
            ? "border-rose-500/35 bg-rose-500/10 text-rose-200"
            : "border-amber-500/35 bg-amber-500/10 text-amber-200";
      return {
        id: Number(s.id),
        statusRaw,
        statusLabel,
        statusClass,
        criadoEm: String(s.criado_em ?? new Date().toISOString()),
        respondidoEm: (s as { respondido_em?: string | null }).respondido_em ?? null,
        sugeridorId: viewerUserId,
        sugeridorNome: String(profile.nome ?? "Você"),
        sugeridorAvatarUrl: String(profile.avatar_url ?? "") || null,
        meuTimeId: Number(s.sugeridor_time_id ?? 0) || null,
        meuTimeTipo: String(s.modalidade ?? "time"),
        meuTimeNome: String((time as { nome?: string | null } | null)?.nome ?? "Formação"),
        meuTimeAvatarUrl: String((time as { escudo?: string | null } | null)?.escudo ?? "") || null,
        meuTimeNotaEid: Number((time as { eid_time?: number | null } | null)?.eid_time ?? 0),
        meuTimeLocalizacao: String((time as { localizacao?: string | null } | null)?.localizacao ?? "") || null,
        alvoTimeNome: String((sugEnvTimesMap.get(Number(s.alvo_time_id ?? 0)) as { nome?: string | null } | null)?.nome ?? "Formação"),
        alvoLocalizacao:
          String(
            (sugEnvTimesMap.get(Number(s.alvo_time_id ?? 0)) as { localizacao?: string | null } | null)?.localizacao ?? "",
          ).trim() || null,
        esporte: sugEnvEspMap.get(Number(s.esporte_id ?? 0)) ?? "Esporte",
        modalidade: String(s.modalidade ?? "time"),
        mensagem: String(s.mensagem ?? "").trim() || null,
      };
    })
    .filter((s) => s.statusRaw !== "recusado" && s.statusRaw !== "cancelado")
    .sort((a, b) => {
      const priority = (status: string) => {
        if (status === "pendente") return 0;
        if (status === "aprovado") return 1;
        return 2;
      };
      const p = priority(a.statusRaw) - priority(b.statusRaw);
      if (p !== 0) return p;
      return new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime();
    });
  const { data: convites } = await supabase
    .from("time_convites")
    .select(
      "id, time_id, convidado_por_usuario_id, criado_em, times!inner(id, nome, tipo, escudo, eid_time, localizacao, lat, lng, esportes(nome))",
    )
    .eq("convidado_usuario_id", viewerUserId)
    .eq("status", "pendente")
    .order("id", { ascending: false })
    .limit(30);
  const inviterIds = [...new Set((convites ?? []).map((c) => c.convidado_por_usuario_id).filter(Boolean))] as string[];
  const { data: inviteProfiles } = inviterIds.length
    ? await supabase
        .from("profiles")
        .select("id, nome, username, avatar_url, localizacao")
        .in("id", inviterIds)
    : { data: [] as { id: string; nome: string | null; username: string | null; avatar_url: string | null; localizacao: string | null }[] };
  const inviteProfileMap = new Map((inviteProfiles ?? []).map((u) => [u.id, u]));
  const conviteItems: ConviteTimeItem[] = (convites ?? []).map((c) => {
    const t = Array.isArray(c.times) ? c.times[0] : c.times;
    const esp = t?.esportes ? (Array.isArray(t.esportes) ? t.esportes[0] : t.esportes) : null;
    const inviterId = String(c.convidado_por_usuario_id ?? "");
    const inv = inviteProfileMap.get(inviterId);
    const invNome = inv?.nome?.trim() || inv?.username?.trim() || "Líder";
    return {
      id: Number(c.id),
      equipeNome: t?.nome ?? "Equipe",
      equipePrimeiroNome: primeiroNome(t?.nome ?? null),
      equipeId: Number(t?.id ?? 0),
      equipeTipo: String(t?.tipo ?? "time"),
      equipeAvatarUrl: (t as { escudo?: string | null } | null)?.escudo ?? null,
      equipeNotaEid: Number((t as { eid_time?: number | null } | null)?.eid_time ?? 0),
      equipeLocalizacao: (t as { localizacao?: string | null } | null)?.localizacao ?? null,
      equipeDistanceKm:
        hasMyCoords &&
        Number.isFinite(Number((t as { lat?: number | null } | null)?.lat ?? NaN)) &&
        Number.isFinite(Number((t as { lng?: number | null } | null)?.lng ?? NaN))
          ? distanciaKm(
              myLat,
              myLng,
              Number((t as { lat?: number | null } | null)?.lat ?? NaN),
              Number((t as { lng?: number | null } | null)?.lng ?? NaN),
            )
          : null,
      esporteNome: esp?.nome ?? "Esporte",
      criadoEm: String((c as { criado_em?: string | null }).criado_em ?? new Date().toISOString()),
      convidadoPorUsuarioId: inviterId,
      convidadoPorNome: invNome,
      convidadoPorPrimeiroNome: primeiroNome(invNome),
      convidadoPorUsername: inv?.username?.trim() ? `@${inv.username.trim()}` : null,
      convidadoPorAvatarUrl: inv?.avatar_url ?? null,
      convidadoPorLocalizacao: inv?.localizacao ?? null,
    };
  });
  const { data: convitesEnviados } = await supabase
    .from("time_convites")
    .select(
      "id, time_id, convidado_usuario_id, status, criado_em, respondido_em, times!inner(id, nome, tipo, escudo, eid_time, localizacao, esporte_id, esportes(nome))",
    )
    .eq("convidado_por_usuario_id", viewerUserId)
    .order("id", { ascending: false })
    .limit(40);
  const convidadoIds = [...new Set((convitesEnviados ?? []).map((c) => String(c.convidado_usuario_id ?? "")).filter(Boolean))] as string[];
  const { data: convidadosPerfis } = convidadoIds.length
    ? await supabase.from("profiles").select("id, nome, username, avatar_url, localizacao, lat, lng").in("id", convidadoIds)
    : { data: [] };
  const convidadosMap = new Map(
    (convidadosPerfis ?? []).map((p) => [
      p.id,
      {
        nome: p.nome,
        username: (p as { username?: string | null }).username ?? null,
        avatarUrl: (p as { avatar_url?: string | null }).avatar_url ?? null,
        localizacao: (p as { localizacao?: string | null }).localizacao ?? null,
        lat: Number((p as { lat?: number | null }).lat ?? NaN),
        lng: Number((p as { lng?: number | null }).lng ?? NaN),
      },
    ]),
  );
  const conviteEsporteIds = [
    ...new Set(
      (convitesEnviados ?? [])
        .map((c) => {
          const t = Array.isArray((c as { times?: unknown }).times)
            ? ((c as { times?: Array<{ esporte_id?: number | null }> }).times?.[0] ?? null)
            : ((c as { times?: { esporte_id?: number | null } }).times ?? null);
          return Number(t?.esporte_id ?? 0);
        })
        .filter((id) => Number.isFinite(id) && id > 0),
    ),
  ];
  const { data: convitesEidRows } =
    convidadoIds.length && conviteEsporteIds.length
      ? await supabase
          .from("usuario_eid")
          .select("usuario_id, esporte_id, nota_eid")
          .in("usuario_id", convidadoIds)
          .in("esporte_id", conviteEsporteIds)
      : { data: [] as Array<{ usuario_id: string; esporte_id: number; nota_eid: number | null }> };
  const convitesEidMap = new Map(
    (convitesEidRows ?? []).map((r) => [`${String(r.usuario_id)}:${Number(r.esporte_id)}`, Number(r.nota_eid ?? 0)]),
  );
  const conviteEnviadoItems: ConviteTimeEnviadoItem[] = (convitesEnviados ?? [])
    .map((c) => {
      const t = Array.isArray(c.times) ? c.times[0] : c.times;
      const esp = t?.esportes ? (Array.isArray(t.esportes) ? t.esportes[0] : t.esportes) : null;
      const convidadoId = String(c.convidado_usuario_id ?? "");
      const perfilRow = convidadosMap.get(convidadoId);
      const esporteId = Number((t as { esporte_id?: number | null } | null)?.esporte_id ?? 0);
      return {
        id: Number(c.id),
        equipeNome: t?.nome ?? "Equipe",
        equipeId: Number(t?.id ?? 0),
        equipeTipo: String(t?.tipo ?? "time"),
        equipeAvatarUrl: (t as { escudo?: string | null } | null)?.escudo ?? null,
        equipeNotaEid: Number((t as { eid_time?: number | null } | null)?.eid_time ?? 0),
        equipeLocalizacao: (t as { localizacao?: string | null } | null)?.localizacao ?? null,
        esporteNome: esp?.nome ?? "Esporte",
        convidadoId,
        convidadoNome: perfilRow?.nome ?? "Atleta",
        convidadoUsername: perfilRow?.username ?? null,
        convidadoAvatarUrl: perfilRow?.avatarUrl ?? null,
        convidadoNotaEid: convitesEidMap.get(`${convidadoId}:${esporteId}`) ?? 0,
        convidadoLocalizacao: perfilRow?.localizacao ?? null,
        convidadoDistanceKm:
          hasMyCoords && Number.isFinite(Number(perfilRow?.lat ?? NaN)) && Number.isFinite(Number(perfilRow?.lng ?? NaN))
            ? distanciaKm(myLat, myLng, Number(perfilRow?.lat ?? NaN), Number(perfilRow?.lng ?? NaN))
            : null,
        status: String(c.status ?? "pendente"),
        criadoEm: (c as { criado_em?: string | null }).criado_em ?? null,
        respondidoEm: (c as { respondido_em?: string | null }).respondido_em ?? null,
      };
    })
    .filter((c) => {
      const s = String(c.status ?? "").trim().toLowerCase();
      return s !== "recusado" && s !== "cancelado";
    });
  const { data: candidaturasEquipeRaw } = await supabase
    .from("time_candidaturas")
    .select(
      "id, time_id, mensagem, criado_em, candidato_usuario_id, times!inner(id, nome, criador_id, esporte_id, tipo, escudo, eid_time, localizacao, esportes(nome))",
    )
    .eq("status", "pendente")
    .eq("times.criador_id", viewerUserId)
    .order("criado_em", { ascending: false })
    .limit(40);
  const candEquipeIds = [
    ...new Set((candidaturasEquipeRaw ?? []).map((p) => String(p.candidato_usuario_id ?? "")).filter(Boolean)),
  ] as string[];
  const { data: candEquipeProfiles } = candEquipeIds.length
    ? await supabase.from("profiles").select("id, nome, username, avatar_url, localizacao").in("id", candEquipeIds)
    : {
        data: [] as { id: string; nome: string | null; username: string | null; avatar_url: string | null; localizacao: string | null }[],
      };
  const candEquipeEsporteIds = [
    ...new Set(
      (candidaturasEquipeRaw ?? [])
        .map((p) => {
          const t = Array.isArray((p as { times?: unknown }).times)
            ? ((p as { times?: Array<{ esporte_id?: number | null }> }).times?.[0] ?? null)
            : ((p as { times?: { esporte_id?: number | null } }).times ?? null);
          return Number(t?.esporte_id ?? 0);
        })
        .filter((id) => Number.isFinite(id) && id > 0),
    ),
  ];
  const { data: candEquipeEidRows } =
    candEquipeIds.length && candEquipeEsporteIds.length
      ? await supabase
          .from("usuario_eid")
          .select("usuario_id, esporte_id, nota_eid")
          .in("usuario_id", candEquipeIds)
          .in("esporte_id", candEquipeEsporteIds)
      : { data: [] as Array<{ usuario_id: string; esporte_id: number; nota_eid: number | null }> };
  const candEquipeEidMap = new Map(
    (candEquipeEidRows ?? []).map((r) => [`${String(r.usuario_id)}:${Number(r.esporte_id)}`, Number(r.nota_eid ?? 0)]),
  );
  const candEquipeMap = new Map((candEquipeProfiles ?? []).map((r) => [r.id, r]));
  const candidaturasEquipe = (candidaturasEquipeRaw ?? []).map((raw) => {
    const p = raw as {
      id: number;
      time_id: number;
      mensagem: string | null;
      criado_em: string;
      candidato_usuario_id: string;
      times:
        | {
            id: number;
            nome: string | null;
            criador_id: string;
            esporte_id: number | null;
            tipo: string | null;
            escudo?: string | null;
            eid_time?: number | null;
            localizacao?: string | null;
            esportes?: { nome: string | null } | { nome: string | null }[] | null;
          }
        | {
            id: number;
            nome: string | null;
            criador_id: string;
            esporte_id: number | null;
            tipo: string | null;
            escudo?: string | null;
            eid_time?: number | null;
            localizacao?: string | null;
            esportes?: { nome: string | null } | { nome: string | null }[] | null;
          }[];
    };
    const team = Array.isArray(p.times) ? p.times[0] : p.times;
    const prof = candEquipeMap.get(p.candidato_usuario_id);
    const esporteId = Number(team?.esporte_id ?? 0);
    const notaEid = candEquipeEidMap.get(`${p.candidato_usuario_id}:${esporteId}`) ?? 0;
    const espRel = team?.esportes;
    const esporteNome = (Array.isArray(espRel) ? espRel[0]?.nome : espRel?.nome)?.trim() || "Esporte";
    const isDuplaTipo =
      String(team?.tipo ?? "")
        .trim()
        .toLowerCase() === "dupla";
    return {
      id: p.id,
      timeId: p.time_id,
      candidatoId: p.candidato_usuario_id,
      nome: prof?.nome?.trim() || prof?.username?.trim() || "Atleta",
      primeiroNome: primeiroNome(prof?.nome?.trim() || prof?.username?.trim() || "Atleta"),
      username: prof?.username?.trim() ? `@${prof.username.trim()}` : null,
      avatarUrl: prof?.avatar_url ?? null,
      candidatoLocalizacao: prof?.localizacao ?? null,
      notaEid,
      mensagem: p.mensagem?.trim() || null,
      criadoEm: p.criado_em,
      timeNome: team?.nome ?? "sua formação",
      timeTipo: String(team?.tipo ?? "time"),
      timePrimeiroNome: primeiroNome(team?.nome ?? null),
      timeEscudoUrl: team?.escudo ?? null,
      timeNotaEid: Number(team?.eid_time ?? 0),
      timeLocalizacao: team?.localizacao ?? null,
      esporteNome,
      isDuplaTipo,
    };
  });
  const { data: minhasCandidaturasRaw } = await supabase
    .from("time_candidaturas")
    .select(
      "id, time_id, status, mensagem, criado_em, respondido_em, times(id, nome, tipo, esporte_id, escudo, eid_time, localizacao, esportes(nome))",
    )
    .eq("candidato_usuario_id", viewerUserId)
    .order("criado_em", { ascending: false })
    .limit(60);
  const minhasCandEsporteIds = [
    ...new Set(
      (minhasCandidaturasRaw ?? [])
        .map((raw) => {
          const r = raw as {
            times?: { esporte_id?: number | null } | Array<{ esporte_id?: number | null }>;
          };
          const tm = Array.isArray(r.times) ? r.times[0] : r.times;
          return Number(tm?.esporte_id ?? 0);
        })
        .filter((id) => Number.isFinite(id) && id > 0),
    ),
  ];
  const { data: minhasCandEidRows } =
    minhasCandEsporteIds.length > 0
      ? await supabase
          .from("usuario_eid")
          .select("esporte_id, nota_eid")
          .eq("usuario_id", viewerUserId)
          .in("esporte_id", minhasCandEsporteIds)
      : { data: [] as { esporte_id: number; nota_eid: number | null }[] };
  const minhasCandEidMap = new Map(
    (minhasCandEidRows ?? []).map((r) => [Number(r.esporte_id), Number(r.nota_eid ?? 0)]),
  );
  const minhasCandidaturasEquipe = (minhasCandidaturasRaw ?? [])
    .map((raw) => {
      const row = raw as {
        id: number;
        time_id: number;
        status: string | null;
        mensagem: string | null;
        criado_em: string;
        respondido_em: string | null;
        times:
          | {
              id: number;
              nome: string | null;
              tipo: string | null;
              esporte_id?: number | null;
              escudo?: string | null;
              eid_time?: number | null;
              localizacao?: string | null;
              esportes?: { nome: string | null } | { nome: string | null }[] | null;
            }
          | {
              id: number;
              nome: string | null;
              tipo: string | null;
              esporte_id?: number | null;
              escudo?: string | null;
              eid_time?: number | null;
              localizacao?: string | null;
              esportes?: { nome: string | null } | { nome: string | null }[] | null;
            }[];
      };
      const team = Array.isArray(row.times) ? row.times[0] : row.times;
      const espRel = team?.esportes;
      const espNome = (Array.isArray(espRel) ? espRel[0]?.nome : espRel?.nome)?.trim() || "Esporte";
      const statusRaw = String(row.status ?? "pendente").trim().toLowerCase();
      const statusLabel =
        statusRaw === "aprovado" || statusRaw === "aceita" || statusRaw === "aceito"
          ? "Aprovado"
          : statusRaw === "recusado" || statusRaw === "recusada"
            ? "Recusado"
            : statusRaw === "cancelado" || statusRaw === "cancelada"
              ? "Cancelado"
              : "Pendente";
      const statusClass =
        statusLabel === "Aprovado"
          ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-200"
          : statusLabel === "Recusado" || statusLabel === "Cancelado"
            ? "border-rose-500/35 bg-rose-500/10 text-rose-200"
            : "border-amber-500/35 bg-amber-500/10 text-amber-200";
      const espId = Number(team?.esporte_id ?? 0);
      const notaEidMeu = minhasCandEidMap.get(espId) ?? 0;
      const isDuplaTipo =
        String(team?.tipo ?? "")
          .trim()
          .toLowerCase() === "dupla";
      return {
        id: row.id,
        timeId: row.time_id,
        statusRaw,
        statusLabel,
        statusClass,
        mensagem: row.mensagem?.trim() || null,
        criadoEm: row.criado_em,
        respondidoEm: row.respondido_em,
        timeNome: team?.nome ?? "Formação",
        timeTipo: String(team?.tipo ?? "time"),
        isDuplaTipo,
        notaEidMeu,
        timePrimeiroNome: primeiroNome(team?.nome ?? null),
        timeEscudoUrl: team?.escudo ?? null,
        timeNotaEid: Number(team?.eid_time ?? 0),
        timeLocalizacao: team?.localizacao ?? null,
        esporteNome: espNome,
        meuPrimeiroNome: primeiroNome(profile.nome ?? null),
        meuAvatarUrl: profile.avatar_url ?? null,
        meuLocalizacao: profile.localizacao ?? null,
      };
    })
    .filter((c) => c.statusRaw !== "recusado" && c.statusRaw !== "cancelado");

  const hasEquipeAcoes =
    sugestoesItems.length > 0 ||
    sugestoesEnviadasItems.some((s) => s.statusRaw === "pendente") ||
    conviteItems.length > 0 ||
    candidaturasEquipe.length > 0 ||
    conviteEnviadoItems.some((i) => String(i.status ?? "").toLowerCase() === "pendente") ||
    minhasCandidaturasEquipe.some((c) => c.statusRaw === "pendente");

  if (!hasEquipeAcoes) return null;

  const sugestoesEnviadasSoPendentes = sugestoesEnviadasItems.filter((s) => s.statusRaw === "pendente");
  const convitesEnviadosSoPendentes = conviteEnviadoItems.filter(
    (i) => String(i.status ?? "").toLowerCase() === "pendente",
  );
  const minhasCandSoPendentes = minhasCandidaturasEquipe.filter((c) => c.statusRaw === "pendente");

  return (
    <section className="eid-list-item overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-0 md:p-0">
      <div className="flex items-center justify-between gap-2 border-b border-transparent bg-eid-card px-3 py-2 md:px-4">
        <div className="flex min-w-0 items-center gap-1.5">
          <UserPlus className="h-3.5 w-3.5 shrink-0 text-eid-primary-500" strokeWidth={2} aria-hidden />
          <div className="min-w-0">
            <h2 className="text-[8px] font-black uppercase tracking-[0.14em] text-eid-fg">Equipe</h2>
            <p className="mt-0.5 hidden text-[8px] font-medium text-eid-text-secondary md:block">
              Convites e sugestões de liderança que precisam da sua resposta.
            </p>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-eid-primary-500/30 bg-eid-primary-500/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.08em] text-eid-primary-500 eid-dark:text-eid-primary-300">
          <LayoutGrid className="h-3 w-3 text-eid-primary-500" strokeWidth={2} aria-hidden />
          Formações
        </span>
      </div>
      <div className="px-2 py-2.5 md:px-3 md:py-3">
        <div className="space-y-3">
          <ComunidadeQuadro id="equipe-sugestoes" title="Sugestões da equipe (liderança)" hasPending={sugestoesItems.length > 0}>
            <ComunidadeSugestoesMatch items={sugestoesItems} />
          </ComunidadeQuadro>
          <ComunidadeQuadro
            id="equipe-sugestoes-enviadas"
            title="Sugestões enviadas (aguardando resposta)"
            hasPending={sugestoesEnviadasSoPendentes.length > 0}
            badgeLabel="Pendente"
          >
            <ComunidadeSugestoesEnviadasMatch items={sugestoesEnviadasSoPendentes} viewerUserId={viewerUserId} />
          </ComunidadeQuadro>
          <ComunidadeQuadro id="equipe-convites" title="Convites recebidos" hasPending={conviteItems.length > 0}>
            <ComunidadeConvitesTime items={conviteItems} />
          </ComunidadeQuadro>
          {candidaturasEquipe.length > 0 ? (
            <>
              {candidaturasEquipe.length > 1 ? (
                <h3
                  id="equipe-pedidos-entrada"
                  className="mb-1.5 text-[12px] font-bold leading-snug tracking-tight text-eid-primary-500 eid-dark:text-eid-primary-300"
                >
                  Pedidos para entrar no elenco
                </h3>
              ) : null}
              <ul id={candidaturasEquipe.length === 1 ? "equipe-pedidos-entrada" : undefined} className="space-y-4">
                {candidaturasEquipe.map((c) => {
                  const criado = formatSolicitacaoParts(c.criadoEm);
                  const formacaoHref =
                    Number.isFinite(c.timeId) && c.timeId > 0 ? `/perfil-time/${c.timeId}?from=/comunidade` : "/comunidade";
                  return (
                    <li key={c.id} className={`${getSocialStatusPanelItemShell("pendente")} p-0 text-sm`}>
                      <div className="flex items-center justify-between gap-2 border-b border-transparent bg-[color:color-mix(in_srgb,var(--eid-card)_62%,transparent)] px-3.5 py-2 sm:px-4.5 eid-light:bg-white/95">
                        {candidaturasEquipe.length === 1 ? (
                          <h3 className="min-w-0 text-[11px] font-semibold leading-snug tracking-tight text-eid-primary-500 eid-dark:text-eid-primary-300">
                            Pedidos para entrar no elenco
                          </h3>
                        ) : (
                          <p className="min-w-0 truncate text-[11px] font-medium text-eid-fg">{c.primeiroNome}</p>
                        )}
                        <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-amber-500/40 bg-amber-500/12 px-1.5 py-0.5 text-[7px] font-semibold uppercase tracking-[0.06em] text-amber-800 eid-dark:border-amber-300/65 eid-dark:bg-amber-950/55 eid-dark:text-amber-100 eid-light:border-amber-400 eid-light:bg-yellow-50 eid-light:text-amber-600">
                          <Clock3 className="h-3 w-3 shrink-0 text-amber-800 eid-dark:text-amber-100 eid-light:text-amber-600" strokeWidth={2.25} aria-hidden />
                          Pendente
                        </span>
                      </div>

                      <div className="mt-2 px-0.5 pb-1 pt-0.5 sm:px-1 sm:pb-2 sm:pt-1">
                        <div className="grid min-w-0 grid-cols-3 gap-x-2 gap-y-1 sm:gap-x-5">
                          <div className="flex min-w-0 flex-col items-center">
                            <p className="flex flex-nowrap items-center justify-center gap-1.5 whitespace-nowrap text-[8px] font-semibold uppercase tracking-[0.14em] text-eid-action-600">
                              <User className="h-3.5 w-3.5 shrink-0 text-eid-action-600" strokeWidth={2.25} aria-hidden />
                              <span className="shrink-0">Candidato</span>
                            </p>
                            <ProfileEditDrawerTrigger
                              href={`/perfil/${c.candidatoId}?from=/comunidade`}
                              title={c.nome}
                              fullscreen
                              topMode="backOnly"
                              className="mt-2.5 block w-full max-w-full rounded-lg border border-transparent transition hover:border-eid-primary-500/35"
                            >
                              <div className="flex w-full flex-col items-center gap-2 px-0.5 py-0.5 text-center">
                                <div className="flex w-full flex-col items-center gap-1.5">
                                  <p className="w-full max-w-[12rem] truncate text-[14px] font-semibold leading-tight text-eid-fg">
                                    {c.primeiroNome}
                                  </p>
                                  <div className="relative mt-0.5 h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-eid-card bg-eid-field-bg shadow-sm ring-1 ring-[color:var(--eid-border-subtle)]">
                                    {c.avatarUrl ? (
                                      <Image src={c.avatarUrl} alt="" fill unoptimized className="object-cover" />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center text-lg font-black text-eid-text-muted">
                                        {c.nome.slice(0, 1).toUpperCase()}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex justify-center">
                                  <PedidoElencoEidSeal notaEid={c.notaEid} />
                                </div>
                                <PedidoElencoLocationLight location={c.candidatoLocalizacao} align="center" />
                              </div>
                            </ProfileEditDrawerTrigger>
                          </div>

                          <div className="flex min-w-0 w-full flex-col items-center gap-2.5 px-0.5 pt-0 text-center">
                            <div className="mx-auto flex w-full max-w-[11rem] flex-col items-center gap-0.5">
                              <p className="inline-flex items-center justify-center gap-1.5 text-[10px] tabular-nums text-eid-text-secondary">
                                <Calendar className="h-3 w-3 shrink-0 text-eid-text-muted" strokeWidth={2} aria-hidden />
                                {criado.date}
                              </p>
                              <p className="inline-flex items-center justify-center gap-1.5 text-[10px] tabular-nums text-eid-text-secondary">
                                <Clock className="h-3 w-3 shrink-0 text-eid-text-muted" strokeWidth={2} aria-hidden />
                                {criado.time}
                              </p>
                            </div>
                            <div className="mx-auto flex w-full max-w-[11rem] flex-col items-stretch">
                              <span className="inline-flex w-full items-center justify-center rounded-full border border-sky-300/55 bg-sky-500/12 px-2 py-0.5 text-[7px] font-semibold uppercase tracking-[0.06em] text-eid-fg eid-light:border-sky-200/90 eid-light:bg-sky-100 eid-light:text-[#1a2b4c]">
                                Pedido
                              </span>
                              <div className="mt-2.5 flex w-full flex-col gap-1.5 sm:mt-3">
                                <span className="inline-flex w-full items-center justify-center gap-1 rounded-full border border-teal-500/35 bg-teal-500/12 px-1.5 py-0.5 text-[6.5px] font-semibold uppercase tracking-[0.05em] text-teal-100 eid-light:border-teal-200/90 eid-light:bg-teal-50 eid-light:text-teal-900">
                                  <span className="inline-flex shrink-0 scale-90 text-teal-200 eid-light:text-teal-800">
                                    <ModalidadeGlyphIcon modalidade={c.isDuplaTipo ? "dupla" : "time"} />
                                  </span>
                                  <span className="truncate">{c.isDuplaTipo ? "Dupla" : "Time"}</span>
                                </span>
                                <span className="inline-flex w-full items-center justify-center gap-1 rounded-full border border-orange-500/35 bg-orange-500/10 px-1.5 py-0.5 text-[6.5px] font-semibold uppercase tracking-[0.04em] text-orange-200 eid-light:border-orange-200/90 eid-light:bg-[#fff7ed] eid-light:text-[#9a3412]">
                                  <span className="inline-flex shrink-0 scale-90 text-orange-300 eid-light:text-[#c2410c]">
                                    <SportGlyphIcon sportName={c.esporteNome} />
                                  </span>
                                  <span className="truncate normal-case">{c.esporteNome}</span>
                                </span>
                              </div>
                            </div>
                            <p className="mx-auto w-full max-w-[13rem] text-center text-[10px] leading-snug text-eid-text-secondary">
                              Quer integrar <span className="font-semibold text-eid-fg">{c.timeNome}</span>
                            </p>
                            {c.mensagem ? (
                              <p className="mx-auto w-full max-w-[13rem] rounded-xl border border-[color:var(--eid-border-subtle)] bg-[color:color-mix(in_srgb,var(--eid-card)_88%,var(--eid-surface)_12%)] px-2.5 py-2 text-center text-[10px] leading-snug text-eid-text-secondary eid-light:bg-white/90 eid-light:text-slate-700">
                                “{c.mensagem}”
                              </p>
                            ) : null}
                          </div>

                          <div className="flex min-w-0 flex-col items-center">
                            <p className="flex w-full flex-nowrap items-center justify-center gap-1.5 whitespace-nowrap text-[8px] font-semibold uppercase tracking-[0.14em] text-eid-action-600">
                              <Shield className="h-3.5 w-3.5 shrink-0 text-eid-action-600" strokeWidth={2.25} aria-hidden />
                              <span className="shrink-0">Sua formação</span>
                            </p>
                            <ProfileEditDrawerTrigger
                              href={formacaoHref}
                              title={c.timeNome}
                              fullscreen
                              topMode="backOnly"
                              className="mt-2.5 block w-full max-w-full rounded-lg border border-transparent transition hover:border-eid-primary-500/35"
                            >
                              <div className="flex flex-col items-center gap-2 px-0.5 py-0.5 text-center">
                                <p className="max-w-[12rem] truncate text-[14px] font-semibold leading-tight text-eid-fg">
                                  {c.timePrimeiroNome}
                                </p>
                                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-eid-card bg-eid-field-bg shadow-sm ring-1 ring-[color:var(--eid-border-subtle)]">
                                  {c.timeEscudoUrl ? (
                                    <Image src={c.timeEscudoUrl} alt="" fill unoptimized className="object-cover" />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-lg font-black text-eid-text-muted">
                                      {(c.timeNome ?? "F").slice(0, 1).toUpperCase()}
                                    </div>
                                  )}
                                </div>
                                <div className="flex justify-center">
                                  <PedidoElencoEidSeal notaEid={c.timeNotaEid} />
                                </div>
                                <PedidoElencoLocationLight location={c.timeLocalizacao} align="center" />
                              </div>
                            </ProfileEditDrawerTrigger>
                          </div>
                        </div>

                        <div className="mt-2 border-t border-transparent pt-2">
                          <CandidaturaResponseActions candidaturaId={c.id} className="!items-stretch gap-1.5 px-3 pb-1.5 sm:gap-2 sm:px-4 sm:pb-2" />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : null}
          <ComunidadeQuadro
            id="equipe-convites-enviados"
            title="Convites enviados (aguardando resposta)"
            hasPending={convitesEnviadosSoPendentes.length > 0}
          >
            <ComunidadeConvitesEnviadosTime items={convitesEnviadosSoPendentes} />
          </ComunidadeQuadro>
          <ComunidadeQuadro
            id="equipe-pedidos-enviados"
            title="Pedidos de entrada enviados"
            hasPending={minhasCandSoPendentes.length > 0}
          >
            {minhasCandSoPendentes.length === 0 ? null : (
              <ul className="mt-3 space-y-3">
                {minhasCandSoPendentes.map((c) => {
                  const criado = formatSolicitacaoParts(c.criadoEm);
                  const resp = c.respondidoEm ? formatSolicitacaoParts(c.respondidoEm) : null;
                  const formacaoHref =
                    Number.isFinite(c.timeId) && c.timeId > 0 ? `/perfil-time/${c.timeId}?from=/comunidade` : "/comunidade";
                  return (
                    <li key={c.id} className={`${getSocialStatusPanelItemShell(c.statusRaw)} p-0 text-sm`}>
                      <div className={`${EID_SOCIAL_GRID_3} pt-2`}>
                        <div className="min-w-0 px-2 pb-2 pt-1 sm:px-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.08em] text-amber-200/90">Formação</p>
                          <ProfileEditDrawerTrigger
                            href={formacaoHref}
                            title={c.timeNome}
                            fullscreen
                            topMode="backOnly"
                            className="mt-1 block rounded-lg border border-transparent transition hover:border-eid-primary-500/35"
                          >
                            <div className="flex w-full flex-col items-center px-0.5 py-1">
                              <p className="max-w-full truncate text-center text-[10px] font-black text-eid-fg">
                                {c.timePrimeiroNome}
                              </p>
                              <div className="relative mt-1 h-12 w-12 overflow-hidden rounded-full border border-eid-primary-500/30 bg-eid-surface">
                                {c.timeEscudoUrl ? (
                                  <Image src={c.timeEscudoUrl} alt="" fill unoptimized className="object-cover" />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-sm font-black text-eid-primary-300">
                                    {(c.timeNome ?? "F").slice(0, 1).toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <div className="mt-0.5">
                                <ProfileEidPerformanceSeal notaEid={c.timeNotaEid} compact className="scale-125" />
                              </div>
                              <EidCityState location={c.timeLocalizacao} compact align="center" className="mt-1 w-full" />
                            </div>
                          </ProfileEditDrawerTrigger>
                        </div>

                        <div className="flex min-w-0 flex-col items-center gap-2 px-2 pb-2 pt-1 text-center sm:px-3">
                          <div className="w-full">
                            <p className="text-[11px] tabular-nums text-eid-text-secondary">{criado.date}</p>
                            <p className="mt-0.5 text-[11px] tabular-nums text-eid-text-secondary">{criado.time}</p>
                            <p className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-eid-text-muted">Pedido</p>
                          </div>
                          <div className="flex flex-wrap items-center justify-center gap-1">
                            <span className="inline-flex min-w-0 items-center gap-1 rounded-full border border-eid-primary-500/35 bg-eid-primary-500/10 px-2 py-0.5 text-[9px] font-semibold leading-none text-eid-primary-200">
                              <ModalidadeGlyphIcon modalidade={c.isDuplaTipo ? "dupla" : "time"} />
                              <span className="truncate">{c.isDuplaTipo ? "Dupla" : "Time"}</span>
                            </span>
                            <span className="inline-flex min-w-0 items-center gap-1 rounded-full border border-eid-action-500/35 bg-eid-action-500/10 px-2 py-0.5 text-[9px] font-semibold leading-none text-eid-action-200">
                              <SportGlyphIcon sportName={c.esporteNome} />
                              <span className="truncate">{c.esporteNome}</span>
                            </span>
                          </div>
                          {resp ? (
                            <div className="w-full border-t border-[color:var(--eid-border-subtle)] pt-2">
                              <p className="text-[10px] font-semibold text-eid-text-secondary">Atualizado</p>
                              <p className="text-[11px] tabular-nums text-eid-text-secondary">{resp.date}</p>
                              <p className="text-[11px] tabular-nums text-eid-text-secondary">{resp.time}</p>
                            </div>
                          ) : null}
                          {c.mensagem ? (
                            <p className="w-full rounded-lg bg-eid-surface/35 px-2 py-1.5 text-[10px] text-eid-fg">“{c.mensagem}”</p>
                          ) : null}
                        </div>

                        <div className="flex min-w-0 flex-col items-center px-2 pb-2 pt-1 sm:px-3">
                          <p className="text-center text-[10px] font-black uppercase tracking-[0.08em] text-amber-200/90">Você</p>
                          <ProfileEditDrawerTrigger
                            href={`/perfil/${viewerUserId}?from=/comunidade`}
                            title="Meu perfil"
                            fullscreen
                            topMode="backOnly"
                            className="mt-1 block rounded-lg border border-transparent transition hover:border-eid-primary-500/35"
                          >
                            <div className="flex w-full flex-col items-center px-0.5 py-1">
                              <p className="max-w-full truncate text-center text-[11px] font-black text-eid-fg">{c.meuPrimeiroNome}</p>
                              <div className="relative mt-1 h-12 w-12 overflow-hidden rounded-full border border-eid-primary-500/30 bg-eid-surface">
                                {c.meuAvatarUrl ? (
                                  <Image src={c.meuAvatarUrl} alt="" fill unoptimized className="object-cover" />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-sm font-black text-eid-primary-300">
                                    {(c.meuPrimeiroNome || "?").slice(0, 1).toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <div className="mt-0.5">
                                <ProfileEidPerformanceSeal notaEid={c.notaEidMeu} compact className="scale-125" />
                              </div>
                              <EidCityState location={c.meuLocalizacao} compact align="center" className="mt-1 w-full" />
                            </div>
                          </ProfileEditDrawerTrigger>
                        </div>
                      </div>

                      {c.statusRaw === "pendente" ? (
                        <div className={EID_SOCIAL_PANEL_FOOTER}>
                          <CancelarCandidaturaForm candidaturaId={c.id} compact label="Cancelar" />
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </ComunidadeQuadro>
        </div>
      </div>
    </section>
  );
}
