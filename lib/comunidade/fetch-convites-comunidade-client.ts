import type { ConviteTimeEnviadoItem } from "@/components/comunidade/comunidade-convites-enviados-time";
import type { ConviteTimeItem } from "@/components/comunidade/comunidade-convites-time";
import { distanciaKm } from "@/lib/geo/distance-km";
import type { SupabaseClient } from "@supabase/supabase-js";

function primeiroNome(nome?: string | null) {
  const n = (nome ?? "").trim();
  return n ? n.split(/\s+/u)[0] : "Atleta";
}

export async function fetchConvitesComunidadeCliente(
  supabase: SupabaseClient,
  userId: string,
  coords: { lat: number; lng: number } | null,
): Promise<{ recebidos: ConviteTimeItem[]; enviados: ConviteTimeEnviadoItem[] }> {
  const hasMyCoords = coords !== null;
  const myLat = coords?.lat ?? NaN;
  const myLng = coords?.lng ?? NaN;

  const { data: convites } = await supabase
    .from("time_convites")
    .select(
      "id, time_id, convidado_por_usuario_id, criado_em, times!inner(id, nome, tipo, escudo, eid_time, localizacao, lat, lng, esportes(nome))",
    )
    .eq("convidado_usuario_id", userId)
    .eq("status", "pendente")
    .order("id", { ascending: false })
    .limit(30);

  const inviterIds = [...new Set((convites ?? []).map((c) => c.convidado_por_usuario_id).filter(Boolean))] as string[];
  const { data: inviteProfiles } = inviterIds.length
    ? await supabase.from("profiles").select("id, nome, username, avatar_url, localizacao").in("id", inviterIds)
    : { data: [] as { id: string; nome: string | null; username: string | null; avatar_url: string | null; localizacao: string | null }[] };
  const inviteProfileMap = new Map((inviteProfiles ?? []).map((u) => [u.id, u]));

  const recebidos: ConviteTimeItem[] = (convites ?? []).map((c) => {
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
    .eq("convidado_por_usuario_id", userId)
    .order("id", { ascending: false })
    .limit(40);

  const convidadoIds = [
    ...new Set((convitesEnviados ?? []).map((c) => String(c.convidado_usuario_id ?? "")).filter(Boolean)),
  ] as string[];
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
  const { data: convitesEidRows } = convidadoIds.length && conviteEsporteIds.length
    ? await supabase
        .from("usuario_eid")
        .select("usuario_id, esporte_id, nota_eid")
        .in("usuario_id", convidadoIds)
        .in("esporte_id", conviteEsporteIds)
    : { data: [] as Array<{ usuario_id: string; esporte_id: number; nota_eid: number | null }> };
  const convitesEidMap = new Map(
    (convitesEidRows ?? []).map((r) => [`${String(r.usuario_id)}:${Number(r.esporte_id)}`, Number(r.nota_eid ?? 0)]),
  );

  const enviados: ConviteTimeEnviadoItem[] = (convitesEnviados ?? [])
    .map((c) => {
      const t = Array.isArray(c.times) ? c.times[0] : c.times;
      const esp = t?.esportes ? (Array.isArray(t.esportes) ? t.esportes[0] : t.esportes) : null;
      const convidadoId = String(c.convidado_usuario_id ?? "");
      const perfil = convidadosMap.get(convidadoId);
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
        convidadoNome: perfil?.nome ?? "Atleta",
        convidadoUsername: perfil?.username ?? null,
        convidadoAvatarUrl: perfil?.avatarUrl ?? null,
        convidadoNotaEid: convitesEidMap.get(`${convidadoId}:${esporteId}`) ?? 0,
        convidadoLocalizacao: perfil?.localizacao ?? null,
        convidadoDistanceKm:
          hasMyCoords && Number.isFinite(Number(perfil?.lat ?? NaN)) && Number.isFinite(Number(perfil?.lng ?? NaN))
            ? distanciaKm(myLat, myLng, Number(perfil?.lat ?? NaN), Number(perfil?.lng ?? NaN))
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

  return { recebidos, enviados };
}
