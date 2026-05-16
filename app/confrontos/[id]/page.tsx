import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarClock, ChevronRight, MapPin, Trophy } from "lucide-react";
import { ConfrontoDetalheResultado } from "@/components/confrontos/confronto-detalhe-resultado";
import { loadPublicConfrontos, normalizeConfrontoTipo, sideInitial, type ConfrontoTipo, type ConfrontoSide, type PublicConfronto } from "@/lib/confrontos/public-feed";
import { createClient } from "@/lib/supabase/server";
import { ProfileEditDrawerTrigger } from "@/components/perfil/profile-edit-drawer-trigger";
import { RankPartidaReservaQuadra, type EspacoMembroInfo } from "@/components/rank/rank-partida-reserva-quadra";

export const metadata = {
  title: "Detalhe do confronto | EsporteID",
};

function EidBadge({ value }: { value: number | null }) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return (
    <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-eid-primary-500/35 bg-eid-primary-900/60 px-2 py-0.5 text-[9px] font-black tabular-nums text-eid-primary-200 eid-light:bg-eid-primary-500/12 eid-light:text-eid-primary-700">
      <span className="text-[7px] font-bold uppercase tracking-wider opacity-70">EID</span>
      {value.toFixed(1)}
    </span>
  );
}

function PlayerFace({ side, formacao, interactive }: { side: ConfrontoSide; formacao: boolean; interactive: boolean }) {
  const rounded = formacao ? "rounded-2xl" : "rounded-full";
  const avatarEl = (
    <span
      className={`relative block h-[72px] w-[72px] overflow-hidden ${rounded} border-2 ${
        side.winner ? "border-eid-action-500/80" : "border-[color:var(--eid-border-subtle)]"
      } bg-eid-surface shadow-[0_8px_24px_-16px_rgba(15,23,42,0.55)]`}
    >
      {side.avatarUrl ? (
        <Image src={side.avatarUrl} alt="" fill unoptimized className="object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-base font-black text-eid-primary-300">
          {sideInitial(side)}
        </span>
      )}
      {side.winner ? (
        <span className="absolute -right-1 -top-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-eid-action-500/50 bg-eid-action-500 text-white shadow-[0_6px_14px_-8px_rgba(249,115,22,0.8)]">
          <Trophy className="h-3 w-3" aria-hidden />
        </span>
      ) : null}
    </span>
  );

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
      {interactive ? (
        <ProfileEditDrawerTrigger
          href={side.eidHref}
          fullscreen
          topMode="backOnly"
          openingDelayMs={0}
          title={`Estatísticas EID de ${side.name}`}
          className="group relative block outline-none ring-offset-2 ring-offset-eid-bg transition hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-eid-primary-500 active:scale-[0.98]"
          aria-label={`Estatísticas EID de ${side.name}`}
        >
          {avatarEl}
        </ProfileEditDrawerTrigger>
      ) : (
        <span className="relative block">{avatarEl}</span>
      )}
      <EidBadge value={side.eid} />
      <p className="mt-0.5 line-clamp-2 max-w-[8rem] text-center text-[12px] font-black leading-tight text-eid-fg">
        {side.name}
      </p>
    </div>
  );
}

function InfoRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/55 px-3 py-3 eid-light:bg-white/80">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-eid-primary-500/12 text-eid-primary-400 eid-light:bg-eid-primary-500/10 eid-light:text-eid-primary-600">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-black uppercase tracking-[0.09em] text-eid-text-secondary">{label}</p>
        <div className="mt-0.5 text-[13px] font-bold leading-tight text-eid-fg">{children}</div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-eid-text-secondary/60" aria-hidden />
    </div>
  );
}

function ResumoCard({ item }: { item: PublicConfronto }) {
  const formacao = item.tipo === "dupla" || item.tipo === "time";
  const isEncerrado = item.statusView === "encerrados";
  const scoreText = item.placar ?? null;

  return (
    <div className="overflow-hidden rounded-3xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(160deg,color-mix(in_srgb,var(--eid-card)_96%,var(--eid-primary-500)_4%),var(--eid-card))] shadow-[0_16px_40px_-28px_rgba(15,23,42,0.6),inset_0_1px_0_rgba(255,255,255,0.04)] eid-light:bg-white eid-light:shadow-[0_8px_32px_-20px_rgba(15,23,42,0.12),inset_0_1px_0_rgba(255,255,255,0.9)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] px-4 py-3 eid-light:border-slate-100">
        <p className="text-[11px] font-black uppercase tracking-[0.12em] text-eid-primary-500">Resumo do confronto</p>
        <span className="rounded-full border border-eid-action-500/35 bg-eid-action-500/12 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-eid-action-300 eid-light:text-eid-action-600">
          {item.origem}
        </span>
      </div>

      {/* Players */}
      <div className="grid grid-cols-[minmax(0,1fr)_3.5rem_minmax(0,1fr)] items-center gap-2 px-4 py-5">
        <PlayerFace side={item.ladoA} formacao={formacao} interactive={isEncerrado} />
        <div className="flex flex-col items-center gap-1">
          <span className="rounded-full border border-eid-action-500/35 bg-eid-action-500/12 px-2.5 py-1.5 text-[11px] font-black tracking-tight text-eid-action-300 eid-light:text-eid-action-600">
            VS
          </span>
        </div>
        <PlayerFace side={item.ladoB} formacao={formacao} interactive={isEncerrado} />
      </div>

      {/* Info rows */}
      <div className="grid gap-2 px-4 pb-4">
        <InfoRow icon={<CalendarClock className="h-4.5 w-4.5" />} label="Data e hora">
          {item.dataHora ?? "Data a confirmar"}
        </InfoRow>
        <InfoRow icon={<MapPin className="h-4.5 w-4.5" />} label="Local">
          <span className="flex items-center gap-1.5">
            {item.localLogoUrl ? (
              <span className="relative h-5 w-5 shrink-0 overflow-hidden rounded-md border border-[color:var(--eid-border-subtle)] bg-eid-card">
                <Image src={item.localLogoUrl} alt="" fill unoptimized className="object-cover" />
              </span>
            ) : null}
            <span className="truncate">{item.local ?? "Local a confirmar"}</span>
          </span>
        </InfoRow>

        {/* Score box */}
        {scoreText ? (
          <div className="rounded-2xl border border-eid-primary-500/22 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--eid-primary-500)_12%,var(--eid-card)),color-mix(in_srgb,var(--eid-primary-700)_8%,var(--eid-surface)))] px-4 py-4 text-center eid-light:border-eid-primary-500/18 eid-light:bg-[linear-gradient(135deg,rgba(37,99,235,0.06),rgba(37,99,235,0.03))]">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-eid-primary-400 eid-light:text-eid-primary-600">
              Placar final
            </p>
            <p className="mt-2 text-[2.5rem] font-black tabular-nums leading-none tracking-tight text-eid-fg">
              {scoreText}
            </p>
          </div>
        ) : null}

      </div>
    </div>
  );
}

export default async function ConfrontoDetalhePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const embed = (Array.isArray(sp.embed) ? sp.embed[0] : sp.embed) === "1";
  const confrontoId = Number(id);
  if (!Number.isFinite(confrontoId) || confrontoId < 1) notFound();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/confrontos/${confrontoId}`);

  const { data: raw } = await supabase
    .from("partidas")
    .select("id, modalidade, esporte_id, status, data_partida, jogador1_id, jogador2_id, desafiante_id, desafiado_id")
    .eq("id", confrontoId)
    .maybeSingle();
  if (!raw) notFound();
  const tipo: ConfrontoTipo = normalizeConfrontoTipo(String((raw as { modalidade?: string | null }).modalidade ?? "individual"));
  const status = String((raw as { status?: string | null }).status ?? "").trim().toLowerCase();
  const view = ["concluida", "concluída", "finalizada", "encerrada", "validada"].includes(status) ? "encerrados" : "proximos";
  const esporteId = Number((raw as { esporte_id?: number | null }).esporte_id ?? 0) || null;
  const { items } = await loadPublicConfrontos({
    supabase,
    viewerId: user.id,
    statusView: view,
    tipo,
    esporteId,
    page: 8,
  });
  const item = items.find((x) => x.id === confrontoId);
  if (!item) notFound();

  // Phase 6: court booking for rank matches
  const rawRow = raw as {
    data_partida?: string | null;
    jogador1_id?: string | null;
    jogador2_id?: string | null;
    desafiante_id?: string | null;
    desafiado_id?: string | null;
  };
  const isParticipant = [rawRow.jogador1_id, rawRow.jogador2_id, rawRow.desafiante_id, rawRow.desafiado_id]
    .filter(Boolean)
    .some((id) => String(id) === user.id);
  const dataPartida = rawRow.data_partida ? new Date(rawRow.data_partida) : null;

  let espacosMembros: EspacoMembroInfo[] = [];
  let jaTemReservaQuadra = false;

  if (view === "proximos" && isParticipant && dataPartida && !Number.isNaN(dataPartida.getTime())) {
    const diaSemana = dataPartida.getDay();
    const dataStr = dataPartida.toISOString().slice(0, 10);

    const [{ data: socios }, { data: reservaExistente }] = await Promise.all([
      supabase
        .from("espaco_socios")
        .select("id, espaco_generico_id, espacos_genericos!inner(id, nome_publico, slug, modo_reserva)")
        .eq("usuario_id", user.id)
        .eq("status", "ativo"),
      supabase
        .from("reservas_quadra")
        .select("id")
        .eq("partida_id", confrontoId)
        .neq("status_reserva", "cancelada")
        .maybeSingle(),
    ]);

    jaTemReservaQuadra = Boolean(reservaExistente);

    if (!jaTemReservaQuadra && (socios ?? []).length > 0) {
      const espacoIds = (socios ?? []).map((s) => {
        const eg = Array.isArray(s.espacos_genericos) ? s.espacos_genericos[0] : s.espacos_genericos;
        return Number((eg as { id?: number } | null)?.id ?? 0);
      }).filter(Boolean);

      const [{ data: unidades }, { data: horarios }, { data: reservasOcupadas }] = await Promise.all([
        supabase
          .from("espaco_unidades")
          .select("id, espaco_generico_id, nome, tipo_unidade, ativo")
          .in("espaco_generico_id", espacoIds)
          .eq("ativo", true),
        supabase
          .from("espaco_horarios_semanais")
          .select("id, espaco_generico_id, espaco_unidade_id, dia_semana, hora_inicio, hora_fim")
          .in("espaco_generico_id", espacoIds)
          .eq("dia_semana", diaSemana)
          .eq("ativo", true),
        supabase
          .from("reservas_quadra")
          .select("espaco_unidade_id, inicio, fim")
          .in("espaco_generico_id", espacoIds)
          .neq("status_reserva", "cancelada")
          .gte("inicio", `${dataStr}T00:00:00.000Z`)
          .lte("inicio", `${dataStr}T23:59:59.999Z`),
      ]);

      for (const socio of socios ?? []) {
        const eg = Array.isArray(socio.espacos_genericos) ? socio.espacos_genericos[0] : socio.espacos_genericos;
        const espaco = eg as { id: number; nome_publico: string | null; slug: string | null; modo_reserva: string | null } | null;
        if (!espaco?.id) continue;

        const unidadesDoEspaco = (unidades ?? []).filter((u) => u.espaco_generico_id === espaco.id);
        const horariosDoEspaco = (horarios ?? []).filter((h) => h.espaco_generico_id === espaco.id);
        const reservasDoDia = (reservasOcupadas ?? []);

        const unidadesComSlots = unidadesDoEspaco.map((u) => {
          const horariosUnidade = horariosDoEspaco.filter(
            (h) => h.espaco_unidade_id === u.id || h.espaco_unidade_id === null
          );
          const slots = horariosUnidade
            .filter((h) => {
              const slotInicio = `${dataStr}T${String(h.hora_inicio).slice(0, 5)}:00.000Z`;
              const slotFim = `${dataStr}T${String(h.hora_fim).slice(0, 5)}:00.000Z`;
              return !reservasDoDia.some(
                (r) =>
                  (r.espaco_unidade_id === u.id || r.espaco_unidade_id === null) &&
                  String(r.inicio) < slotFim &&
                  String(r.fim) > slotInicio
              );
            })
            .map((h) => ({
              inicio: `${dataStr}T${String(h.hora_inicio).slice(0, 5)}:00.000Z`,
              fim: `${dataStr}T${String(h.hora_fim).slice(0, 5)}:00.000Z`,
              label: `${String(h.hora_inicio).slice(0, 5)}–${String(h.hora_fim).slice(0, 5)}`,
            }));
          return { id: u.id, nome: String(u.nome ?? `Quadra ${u.id}`), slots };
        });

        // Also handle slots with no specific unit (espaco_unidade_id = null)
        const horariosGerais = horariosDoEspaco.filter((h) => h.espaco_unidade_id === null && unidadesDoEspaco.length === 0);
        const slotsGerais = horariosGerais
          .filter((h) => {
            const slotInicio = `${dataStr}T${String(h.hora_inicio).slice(0, 5)}:00.000Z`;
            const slotFim = `${dataStr}T${String(h.hora_fim).slice(0, 5)}:00.000Z`;
            return !reservasDoDia.some(
              (r) => String(r.inicio) < slotFim && String(r.fim) > slotInicio
            );
          })
          .map((h) => ({
            inicio: `${dataStr}T${String(h.hora_inicio).slice(0, 5)}:00.000Z`,
            fim: `${dataStr}T${String(h.hora_fim).slice(0, 5)}:00.000Z`,
            label: `${String(h.hora_inicio).slice(0, 5)}–${String(h.hora_fim).slice(0, 5)}`,
          }));

        const todasUnidades = [
          ...unidadesComSlots,
          ...(slotsGerais.length > 0 ? [{ id: 0, nome: "Quadra geral", slots: slotsGerais }] : []),
        ].filter((u) => u.slots.length > 0);

        if (todasUnidades.length > 0) {
          espacosMembros.push({
            espacoId: espaco.id,
            espacoNome: String(espaco.nome_publico ?? "Espaço"),
            espacoSlug: espaco.slug,
            unidades: todasUnidades,
          });
        }
      }
    }
  }

  const nomeA = item.ladoA.name;
  const esporteLabel = item.esporteNome ?? "";
  const modalidadeLabel =
    item.tipo === "dupla" ? "Duplas" : item.tipo === "time" ? "Times" : "Individual";

  return (
    <main className={`mx-auto flex w-full max-w-lg flex-col gap-3 px-3 pb-[calc(var(--eid-shell-content-bottom-pad)+2rem)] sm:max-w-2xl sm:px-6 sm:pb-[var(--eid-shell-content-bottom-pad)] ${embed ? "pt-1" : "pt-3"}`}>
      {/* Page header — only when accessed directly (drawer provides its own nav) */}
      {!embed ? (
        <div className="flex items-center gap-3">
          <Link
            href={`/confrontos?view=${view}${tipo !== "individual" ? `&tipo=${tipo}` : ""}`}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/55 text-eid-primary-300 transition hover:bg-eid-surface active:scale-[0.95]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-[15px] font-black leading-tight text-eid-fg">
              {nomeA}{esporteLabel ? ` · ${esporteLabel}` : ""}
            </h1>
            <p className="text-[11px] text-eid-text-secondary">Modalidade: {modalidadeLabel}</p>
          </div>
        </div>
      ) : null}

      {/* Resumo card */}
      <ResumoCard item={item} />

      {/* Detailed score breakdown (sets, rounds, goals) */}
      {(item.statusView === "encerrados" || item.placar) ? <ConfrontoDetalheResultado item={item} /> : null}

      {/* Court booking for rank matches */}
      {(espacosMembros.length > 0 || jaTemReservaQuadra) ? (
        <RankPartidaReservaQuadra
          partidaId={confrontoId}
          espacos={espacosMembros}
          jaTemReserva={jaTemReservaQuadra}
        />
      ) : null}
    </main>
  );
}
