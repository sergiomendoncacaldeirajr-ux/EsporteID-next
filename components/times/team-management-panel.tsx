"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useActionState } from "react";
import { criarEquipe, convidarUsuarioParaEquipe, type TeamActionState } from "@/app/times/actions";
import { emitEidSocialDataRefresh } from "@/lib/comunidade/social-panel-layout";
import { ProfileEditDrawerTrigger } from "@/components/perfil/profile-edit-drawer-trigger";
import { EidInviteButton } from "@/components/ui/eid-invite-button";
import { ModalidadeGlyphIcon, SportGlyphIcon } from "@/lib/perfil/formacao-glyphs";

const initial: TeamActionState = { ok: false, message: "" };

type Sport = { id: number; nome: string };
type Team = { id: number; nome: string; tipo: string | null; esporteNome: string };
type AtletaSuggest = { id: string; title: string; subtitle: string | null };

type FullscreenLaunchers = {
  fromHref: string;
  hasEquipes: boolean;
  convidarUsuarioId?: string;
};

type TeamManagementPanelProps =
  | {
      fullscreenLaunchers: FullscreenLaunchers;
    }
  | {
      esportes: Sport[];
      minhasEquipes: Team[];
      defaultOpenCreate?: boolean;
      manageHrefTemplate?: string;
      /** UUID do atleta: após criar a formação, envia convite automaticamente (server action). */
      convidarUsuarioIdAposCriar?: string;
      /** Ao convidar a partir do perfil, sugerimos dupla por padrão. */
      defaultTipoFormacao?: "time" | "dupla";
      /** Pré-seleção do esporte (ex.: link do radar /desafio). */
      defaultEsporteId?: number;
      /** `create` / `invite`: telas cheias separadas; `all`: acordeão com os dois blocos (legado). */
      panelMode?: "all" | "create" | "invite";
      /** Aparência específica do formulário de cadastro em tela cheia. */
      createStyle?: "default" | "cadastrar";
      /** Aparência específica do formulário de convite em tela cheia. */
      inviteStyle?: "default" | "convidar";
      fullscreenLaunchers?: undefined;
    };

export function TeamManagementPanel(props: TeamManagementPanelProps) {
  if ("fullscreenLaunchers" in props && props.fullscreenLaunchers) {
    const { fromHref, hasEquipes, convidarUsuarioId } = props.fullscreenLaunchers;
    const cadQs = new URLSearchParams();
    cadQs.set("from", fromHref);
    cadQs.set("embed", "1");
    if (convidarUsuarioId) cadQs.set("convidar", convidarUsuarioId);
    const cadastrarHref = `/editar/equipes/cadastrar?${cadQs.toString()}`;
    const convidarHref = `/editar/equipes/convidar?from=${encodeURIComponent(fromHref)}&embed=1`;
    const launcherClass =
      "eid-vagas-hero-cta flex min-h-[34px] w-full items-center justify-center gap-1 rounded-full border border-eid-primary-500/35 bg-[linear-gradient(90deg,#2563eb,#0d6efd)] px-2.5 text-center text-[8px] font-black uppercase tracking-[0.02em] text-white shadow-[0_10px_20px_-16px_rgba(37,99,235,0.65)] transition hover:brightness-110 sm:min-h-[38px] sm:px-3 sm:text-[9px]";
    const launcherSecondaryClass =
      "eid-vagas-hero-cta flex min-h-[34px] w-full items-center justify-center gap-1 rounded-full border border-eid-primary-500/55 bg-transparent px-2.5 text-center text-[8px] font-black uppercase tracking-[0.02em] text-eid-primary-400 transition hover:bg-eid-primary-500/8 sm:min-h-[38px] sm:px-3 sm:text-[9px]";
    return (
      <section className="grid min-w-0 grid-cols-2 gap-2 sm:gap-3">
        <ProfileEditDrawerTrigger href={cadastrarHref} title="Criar novo" fullscreen topMode="backOnly" className={launcherClass}>
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 sm:h-[17px] sm:w-[17px]" fill="currentColor" aria-hidden>
            <circle cx="8.5" cy="9" r="2.4" />
            <circle cx="15.5" cy="10" r="2.1" />
            <path d="M4.5 18a4 4 0 0 1 8 0" />
            <path d="M13.5 17.8a3.4 3.4 0 0 1 4.5-3.2" />
            <path d="M18.8 7.1v4M16.8 9.1h4" />
          </svg>
          <span>CRIAR NOVO</span>
        </ProfileEditDrawerTrigger>
        <ProfileEditDrawerTrigger
          href={convidarHref}
          title="Convidar atleta"
          fullscreen
          topMode="backOnly"
          className={`${launcherSecondaryClass} ${!hasEquipes ? "opacity-75" : ""}`}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 sm:h-[17px] sm:w-[17px]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="9" cy="8.3" r="2.4" />
            <path d="M4.8 18a4.2 4.2 0 0 1 8.4 0" />
            <path d="M17.8 7.2v4M15.8 9.2h4" />
          </svg>
            <span>Convidar atleta</span>
          </ProfileEditDrawerTrigger>
      </section>
    );
  }

  const {
    esportes,
    minhasEquipes,
    defaultOpenCreate,
    manageHrefTemplate,
    convidarUsuarioIdAposCriar,
    defaultTipoFormacao,
    defaultEsporteId,
    panelMode = "all",
    createStyle = "default",
    inviteStyle = "default",
  } = props;
  const isCadastrarStyle = createStyle === "cadastrar";
  const isConvidarStyle = inviteStyle === "convidar";
  const router = useRouter();
  const [createState, createAction, createPending] = useActionState(criarEquipe, initial);
  const [inviteState, inviteAction, invitePending] = useActionState(convidarUsuarioParaEquipe, initial);
  const [tipo, setTipo] = useState<"time" | "dupla">(defaultTipoFormacao ?? "time");
  const [esporteId, setEsporteId] = useState<string>(() => {
    if (defaultEsporteId != null && esportes.some((e) => e.id === defaultEsporteId)) {
      return String(defaultEsporteId);
    }
    if (esportes.length === 1) return String(esportes[0].id);
    return "";
  });
  const [localizacao, setLocalizacao] = useState("");
  const [gpsStatus, setGpsStatus] = useState<"idle" | "loading" | "error">("idle");
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [inviteTeamId, setInviteTeamId] = useState<string>("");
  const [inviteQuery, setInviteQuery] = useState("");
  const [pickedInviteUserId, setPickedInviteUserId] = useState<string | null>(null);
  const [inviteSuggestions, setInviteSuggestions] = useState<AtletaSuggest[]>([]);
  const [inviteSuggestOpen, setInviteSuggestOpen] = useState(false);
  const [inviteSuggestLoading, setInviteSuggestLoading] = useState(false);

  useEffect(() => {
    if (esporteId !== "" || esportes.length === 0) return;
    setEsporteId(String(esportes[0].id));
  }, [esportes, esporteId]);

  useEffect(() => {
    if (!manageHrefTemplate) return;
    if (!createState.ok || !createState.createdTimeId) return;
    let nextHref = manageHrefTemplate.replace(":id", String(createState.createdTimeId));
    if (createState.inviteAutoSent) {
      try {
        const base = "https://eid.local";
        const u = new URL(nextHref, base);
        u.searchParams.delete("convidar");
        nextHref = `${u.pathname}${u.search}`;
      } catch {
        /* manter href */
      }
    }
    router.push(nextHref);
  }, [createState, manageHrefTemplate, router]);

  useEffect(() => {
    if (inviteTeamId !== "" || minhasEquipes.length === 0) return;
    setInviteTeamId(String(minhasEquipes[0].id));
  }, [inviteTeamId, minhasEquipes]);

  useEffect(() => {
    if (!isConvidarStyle) return;
    const q = inviteQuery.trim().replace(/^@+/, "");
    if (pickedInviteUserId || q.length < 3) {
      if (q.length < 3) {
        setInviteSuggestions([]);
        setInviteSuggestOpen(false);
      }
      return;
    }

    let cancelled = false;
    const t = window.setTimeout(() => {
      void (async () => {
        setInviteSuggestLoading(true);
        try {
          const r = await fetch(`/api/search/suggest?q=${encodeURIComponent(q)}&scope=atletas`, { credentials: "same-origin" });
          const j = (await r.json()) as { items?: AtletaSuggest[] };
          if (cancelled) return;
          const items = Array.isArray(j.items) ? j.items : [];
          setInviteSuggestions(items);
          setInviteSuggestOpen(items.length > 0);
        } catch {
          if (!cancelled) {
            setInviteSuggestions([]);
            setInviteSuggestOpen(false);
          }
        } finally {
          if (!cancelled) setInviteSuggestLoading(false);
        }
      })();
    }, 240);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
      setInviteSuggestLoading(false);
    };
  }, [inviteQuery, pickedInviteUserId, isConvidarStyle]);

  useEffect(() => {
    if (!inviteState.ok) return;
    emitEidSocialDataRefresh();
    router.refresh();
  }, [inviteState.ok, router]);

  useEffect(() => {
    if (!inviteState.ok || !isConvidarStyle) return;
    setInviteQuery("");
    setPickedInviteUserId(null);
    setInviteSuggestions([]);
    setInviteSuggestOpen(false);
  }, [inviteState.ok, isConvidarStyle]);

  function obterLocalizacao() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGpsStatus("error");
      setGpsError("Seu navegador não suporta geolocalização.");
      return;
    }
    setGpsStatus("loading");
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lng))}`
          );
          if (!resp.ok) throw new Error("Falha ao obter endereço.");
          const data = (await resp.json()) as {
            address?: { city?: string; town?: string; village?: string; state?: string };
          };
          const city = data.address?.city || data.address?.town || data.address?.village || "";
          const state = data.address?.state || "";
          const resolved = [city, state].filter(Boolean).join(" / ");
          if (!resolved) throw new Error("Não foi possível identificar cidade/estado.");
          setLocalizacao(resolved);
          setGpsStatus("idle");
        } catch {
          setGpsStatus("error");
          setGpsError("Não foi possível identificar sua cidade automaticamente.");
        }
      },
      (err) => {
        setGpsStatus("error");
        setGpsError(err.code === 1 ? "Permissão de localização negada." : "Não foi possível obter sua localização.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  const showCreate = panelMode === "all" || panelMode === "create";
  const showInviteBlock =
    (panelMode === "all" || panelMode === "invite") && minhasEquipes.length > 0;

  const createBody = (
    <>
        <p className={`${isCadastrarStyle ? "mt-2.5 text-[11px] text-[#556987]" : "mt-2 text-[11px] text-eid-text-secondary"}`}>
          {convidarUsuarioIdAposCriar
            ? "Escudo obrigatório. Ao salvar, o convite vai para o atleta do perfil (Social)."
            : "Preencha os dados da formação e envie uma foto obrigatória para criar."}
        </p>
        <form action={createAction} className={`${isCadastrarStyle ? "mt-2.5 grid min-w-0 gap-2.5 sm:grid-cols-2" : "mt-3 grid min-w-0 gap-2 sm:grid-cols-2"}`}>
          {convidarUsuarioIdAposCriar ? <input type="hidden" name="convidar_usuario_id" value={convidarUsuarioIdAposCriar} /> : null}
          <div className={`${isCadastrarStyle ? "rounded-[13px] border border-[#C9D8F6] bg-[#F5F8FF] px-3 py-2.5 sm:col-span-2" : "rounded-xl border border-eid-primary-500/25 bg-eid-primary-500/8 px-3 py-2 sm:col-span-2"}`}>
            <div className="flex items-start gap-2.5">
              {isCadastrarStyle ? (
                <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-[0_6px_14px_-10px_rgba(37,99,235,0.45)]">
                  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0 text-[#2563EB]" fill="currentColor" aria-hidden>
                    <path d="m12 2 7 2.4V11c0 4.1-2.8 7.7-7 9-4.2-1.3-7-4.9-7-9V4.4L12 2Z" />
                    <path d="m12 7.2 1.5 3 3.3.5-2.4 2.3.6 3.3-3-1.6-3 1.6.6-3.3-2.4-2.3 3.3-.5 1.5-3Z" fill="#60A5FA" />
                  </svg>
                </span>
              ) : null}
              <div className="min-w-0">
                <p className={`${isCadastrarStyle ? "text-[11px] font-black uppercase tracking-[0.05em] text-[#2563EB]" : "text-[10px] font-semibold uppercase tracking-[0.08em] text-eid-primary-300"}`}>Escudo do time ou dupla</p>
                <p className={`${isCadastrarStyle ? "mt-1 text-[11px] text-[#556987]" : "mt-1 text-[10px] text-eid-text-secondary"}`}>
              Envie o escudo do time ou da dupla (JPG, PNG, WEBP ou HEIC). Esse envio é obrigatório para concluir o cadastro.
            </p>
              </div>
            </div>
            <input
              type="file"
              name="escudo_file"
              accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
              required
              className={`${isCadastrarStyle ? "mt-2 block w-full text-[10px] text-[#556987] file:mr-2 file:rounded-full file:border file:border-[#C9D8F6] file:bg-white file:px-2.5 file:py-1.5 file:text-[10px] file:font-bold file:text-[#2563EB]" : "mt-2 block w-full text-[11px] text-eid-text-secondary file:mr-2 file:rounded-lg file:border file:border-[color:var(--eid-border-subtle)] file:bg-eid-surface/70 file:px-2.5 file:py-1 file:text-[10px] file:font-semibold file:text-eid-fg"}`}
            />
          </div>

          <p
            className={`${isCadastrarStyle ? "inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.04em] text-eid-fg sm:col-span-2" : "text-[10px] font-semibold uppercase tracking-[0.08em] text-eid-text-secondary sm:col-span-2"}`}
          >
            {isCadastrarStyle ? (
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#2563EB]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <circle cx="8.5" cy="8" r="2.8" />
                <path d="M3.5 18a5 5 0 0 1 10 0" />
                <path d="M15 8h5M17.5 5.5v5" />
              </svg>
            ) : null}
            Dados principais
          </p>
          <input type="hidden" name="tipo" value={tipo} />
          <input type="hidden" name="esporte_id" value={esporteId} />
          <div className="sm:col-span-2">
            <div className={`${isCadastrarStyle ? "flex items-center gap-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card px-3" : ""}`}>
              {isCadastrarStyle ? (
                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-[#64748B]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <circle cx="9" cy="8" r="3" />
                  <path d="M3 19a6 6 0 0 1 12 0" />
                  <path d="M17 8h4M19 6v4" />
                </svg>
              ) : null}
              <input name="nome" required placeholder="Nome da equipe" className={`${isCadastrarStyle ? "h-10 w-full bg-transparent text-[11px] text-eid-fg placeholder:text-[#64748B] focus:outline-none" : "eid-input-dark w-full rounded-xl px-3 py-2 text-sm text-eid-fg"}`} />
            </div>
          </div>
          <div className={`${isCadastrarStyle ? "flex items-center gap-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card px-3 sm:col-span-2" : "sm:col-span-2"}`}>
            {isCadastrarStyle ? (
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-[#64748B]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <circle cx="12" cy="12" r="8" />
                <path d="M8.5 14.8c.8-1.6 2-2.4 3.5-2.4s2.7.8 3.5 2.4" />
                <path d="M9.8 9.8h4.4" />
              </svg>
            ) : null}
            <input name="username" placeholder="@username da equipe (opcional)" className={`${isCadastrarStyle ? "h-10 w-full bg-transparent text-[11px] text-eid-fg placeholder:text-[#64748B] focus:outline-none" : "eid-input-dark w-full rounded-xl px-3 py-2 text-sm text-eid-fg"}`} />
          </div>
          <label className="grid min-w-0 gap-1">
            <span className={`${isCadastrarStyle ? "inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.04em] text-eid-fg" : "text-[10px] font-semibold uppercase tracking-[0.08em] text-eid-text-secondary"}`}>
              {isCadastrarStyle ? (
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#2563EB]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <circle cx="8" cy="8.5" r="2.3" />
                  <circle cx="16" cy="9" r="2.1" />
                  <path d="M4 17.5a4 4 0 0 1 8 0" />
                  <path d="M13 17.5a3.4 3.4 0 0 1 6 0" />
                </svg>
              ) : null}
              Tipo
            </span>
            <div className={`${isCadastrarStyle ? "min-w-0 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-1" : "min-w-0 rounded-lg bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_40%,var(--eid-bg)_60%),color-mix(in_srgb,var(--eid-surface)_34%,var(--eid-bg)_66%))] p-1 backdrop-blur-sm"}`}>
              <div className={`${isCadastrarStyle ? "flex h-7 overflow-hidden rounded-lg bg-[color:color-mix(in_srgb,var(--eid-card)_88%,var(--eid-surface)_12%)]" : "flex h-[1.65rem] overflow-hidden rounded-md bg-[color-mix(in_srgb,var(--eid-bg)_24%,var(--eid-surface)_76%)]"}`}>
                <button
                  type="button"
                  onClick={() => setTipo("time")}
                  className={`inline-flex min-w-0 flex-1 items-center justify-center rounded-sm px-1.5 ${
                    isCadastrarStyle ? "gap-1 text-[10px] font-black tracking-[0.02em]" : "text-[9px] font-semibold uppercase leading-none tracking-[0.03em]"
                  } transition-all duration-200 ${
                    tipo === "time"
                      ? isCadastrarStyle
                        ? "bg-[#DDE9FF] text-[#2563EB]"
                        : "bg-[color-mix(in_srgb,var(--eid-primary-500)_30%,var(--eid-surface)_70%)] text-eid-fg shadow-[0_6px_16px_-10px_rgba(37,99,235,0.42)]"
                      : isCadastrarStyle
                        ? "text-[#334155] hover:bg-eid-surface/35"
                      : "text-eid-text-secondary hover:bg-eid-surface/35"
                  }`}
                >
                  {isCadastrarStyle ? <ModalidadeGlyphIcon modalidade="time" /> : null}
                  Time
                </button>
                <button
                  type="button"
                  onClick={() => setTipo("dupla")}
                  className={`inline-flex min-w-0 flex-1 items-center justify-center rounded-sm px-1.5 ${
                    isCadastrarStyle ? "gap-1 text-[10px] font-black tracking-[0.02em]" : "text-[9px] font-semibold uppercase leading-none tracking-[0.03em]"
                  } transition-all duration-200 ${
                    tipo === "dupla"
                      ? isCadastrarStyle
                        ? "bg-[#DDE9FF] text-[#2563EB]"
                        : "bg-[color-mix(in_srgb,var(--eid-primary-500)_30%,var(--eid-surface)_70%)] text-eid-fg shadow-[0_6px_16px_-10px_rgba(37,99,235,0.42)]"
                      : isCadastrarStyle
                        ? "text-[#334155] hover:bg-eid-surface/35"
                      : "text-eid-text-secondary hover:bg-eid-surface/35"
                  }`}
                >
                  {isCadastrarStyle ? <ModalidadeGlyphIcon modalidade="dupla" /> : null}
                  Dupla
                </button>
              </div>
            </div>
          </label>
          <label className="grid min-w-0 gap-1">
            <span className={`${isCadastrarStyle ? "inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.04em] text-eid-fg" : "text-[10px] font-semibold uppercase tracking-[0.08em] text-eid-text-secondary"}`}>
              {isCadastrarStyle ? (
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#2563EB]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <circle cx="12" cy="12" r="8" />
                  <path d="M4 12h16M12 4a12 12 0 0 1 0 16M12 4a12 12 0 0 0 0 16" />
                </svg>
              ) : null}
              Esporte
            </span>
            <div className={`${isCadastrarStyle ? "min-w-0" : "min-w-0 rounded-lg bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_94%,transparent),color-mix(in_srgb,var(--eid-surface)_92%,transparent))] p-1 backdrop-blur-sm"}`}>
              <div className={`flex w-full min-w-0 items-center gap-1 overflow-x-auto overscroll-x-contain pb-0.5 pr-0.5 whitespace-nowrap [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${isCadastrarStyle ? "" : ""}`}>
                {esportes.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => setEsporteId(String(e.id))}
                    className={`inline-flex h-[1.45rem] shrink-0 items-center justify-center rounded-md px-1.5 text-[8px] font-semibold uppercase leading-none tracking-[0.025em] transition-all duration-200 ${
                      esporteId === String(e.id)
                        ? "bg-eid-primary-500/14 text-eid-fg shadow-[0_7px_16px_-11px_rgba(37,99,235,0.4)]"
                        : "text-eid-text-secondary hover:bg-eid-surface/55"
                    } ${isCadastrarStyle ? "h-[30px] gap-1 rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-card px-2 text-[9px] font-black tracking-[0.02em] [&_svg]:h-3 [&_svg]:w-3" : "gap-1"}`}
                  >
                    <SportGlyphIcon sportName={e.nome} />
                    {e.nome}
                  </button>
                ))}
              </div>
            </div>
            <p className={`${isCadastrarStyle ? "text-[10px] text-[#556987]" : "text-[10px] text-eid-text-secondary"}`}>
              Cada formação vale para um único esporte. Para atuar em outro esporte, crie outra dupla/time.
            </p>
          </label>
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between gap-2">
              <span className={`${isCadastrarStyle ? "inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.04em] text-eid-fg" : "text-[10px] font-semibold uppercase tracking-[0.08em] text-eid-text-secondary"}`}>
                {isCadastrarStyle ? (
                  <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#2563EB]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M12 21s7-4.4 7-11a7 7 0 1 0-14 0c0 6.6 7 11 7 11Z" />
                    <circle cx="12" cy="10" r="2.5" />
                  </svg>
                ) : null}
                Cidade
              </span>
              <button
                type="button"
                onClick={obterLocalizacao}
                className={`${isCadastrarStyle ? "inline-flex min-h-[29px] items-center gap-1 rounded-full border border-[#C9D8F6] bg-white px-2 text-[8px] font-black uppercase tracking-[0.02em] text-[#2563EB] transition-colors hover:bg-[#EEF4FF]" : "inline-flex items-center rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/65 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.07em] text-eid-fg transition-colors hover:border-eid-primary-500/35"}`}
              >
                {isCadastrarStyle ? (
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <circle cx="12" cy="12" r="3.5" />
                    <path d="M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
                  </svg>
                ) : null}
                {gpsStatus === "loading" ? "Obtendo..." : "Obter localização"}
              </button>
            </div>
            <div className={`${isCadastrarStyle ? "mt-2 flex items-center gap-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card px-3" : ""}`}>
              {isCadastrarStyle ? (
                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-[#64748B]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M12 21s7-4.4 7-11a7 7 0 1 0-14 0c0 6.6 7 11 7 11Z" />
                  <circle cx="12" cy="10" r="2.5" />
                </svg>
              ) : null}
            <input
              name="localizacao"
              required
              value={localizacao}
              onChange={(ev) => setLocalizacao(ev.target.value)}
              placeholder="Cidade / Estado"
                className={`${isCadastrarStyle ? "h-10 w-full bg-transparent text-[11px] text-eid-fg placeholder:text-[#64748B] focus:outline-none" : "eid-input-dark mt-1 w-full rounded-xl px-3 py-2 text-sm text-eid-fg"}`}
            />
            </div>
            <p className={`${isCadastrarStyle ? "mt-2 rounded-xl border border-[#F2D8AE] bg-[#FFF8EC] px-3 py-2 text-[10px] font-semibold leading-snug text-[#9A5B06]" : "mt-1 rounded-lg border border-[#d39b2a] bg-[#ffe7b3] px-2 py-1 text-[10px] font-bold leading-snug text-[#4b2b00]"}`}>
              Atenção: a cidade da formação não pode ser alterada depois. Para trocar, será necessário criar outra equipe/dupla.
            </p>
            {gpsError ? <p className="mt-1 text-[10px] text-red-700 dark:text-red-300">{gpsError}</p> : null}
          </div>
          <div className={`${isCadastrarStyle ? "sm:col-span-2 rounded-[14px] border border-[color:var(--eid-border-subtle)] bg-eid-card px-3 py-2.5" : "sm:col-span-2 grid gap-1.5 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2"}`}>
            <p className={`${isCadastrarStyle ? "inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.04em] text-eid-fg" : "text-[10px] font-semibold uppercase tracking-[0.08em] text-eid-text-secondary"}`}>
              {isCadastrarStyle ? (
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#2563EB]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M7 7h10M7 12h10M7 17h10" />
                  <path d="M4 7h.01M4 12h.01M4 17h.01" />
                </svg>
              ) : null}
              Configuração de vagas
            </p>
            <label className={`${isCadastrarStyle ? "mt-2 flex items-start justify-between gap-2.5 rounded-xl border border-[color:var(--eid-border-subtle)] px-2.5 py-2" : "flex items-center gap-2 text-[11px] text-eid-fg"}`}>
              <input type="checkbox" name="vagas_abertas" defaultChecked className="mt-0.5 rounded border-[color:var(--eid-border-subtle)]" />
              <span className="min-w-0">
                <span className="block text-[11px] font-bold text-eid-fg">Deixar vagas abertas para candidatura</span>
                {isCadastrarStyle ? <span className="mt-0.5 block text-[10px] text-[#64748B]">Outros atletas poderão se candidatar para a vaga.</span> : null}
              </span>
              {isCadastrarStyle ? (
                <span className="ml-2 mt-0.5 inline-flex shrink-0 items-center">
                  <svg viewBox="0 0 48 24" className="h-6 w-12" fill="none" aria-hidden>
                    <circle cx="10" cy="9" r="5" fill="#3B82F6" />
                    <circle cx="25" cy="9" r="4.5" fill="#93C5FD" />
                    <circle cx="37" cy="10" r="4" fill="#DBEAFE" />
                    <circle cx="40" cy="18" r="5" fill="#86EFAC" />
                    <path d="M40 15.6v4.8M37.6 18h4.8" stroke="#15803D" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </span>
              ) : null}
            </label>
            <label className={`${isCadastrarStyle ? "mt-2 flex items-start justify-between gap-2.5 rounded-xl border border-[color:var(--eid-border-subtle)] px-2.5 py-2" : "flex items-center gap-2 text-[11px] text-eid-fg"}`}>
              <input type="checkbox" name="aceita_pedidos" defaultChecked className="mt-0.5 rounded border-[color:var(--eid-border-subtle)]" />
              <span className="min-w-0">
                <span className="block text-[11px] font-bold text-eid-fg">Permitir pedidos de entrada</span>
                {isCadastrarStyle ? <span className="mt-0.5 block text-[10px] text-[#64748B]">Atletas poderão solicitar entrada na formação.</span> : null}
              </span>
              {isCadastrarStyle ? (
                <span className="ml-2 mt-0.5 inline-flex shrink-0 items-center">
                  <svg viewBox="0 0 44 24" className="h-6 w-11" fill="none" aria-hidden>
                    <rect x="2.5" y="3.5" width="27" height="17" rx="3.5" stroke="#93C5FD" strokeWidth="1.6" />
                    <path d="m4 5 12 8 12-8" stroke="#93C5FD" strokeWidth="1.6" />
                    <circle cx="35.5" cy="17.5" r="5" fill="#86EFAC" />
                    <path d="M35.5 15.2v4.6M33.2 17.5h4.6" stroke="#15803D" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </span>
              ) : null}
            </label>
          </div>

          {isCadastrarStyle ? (
            <div className="sm:col-span-2 rounded-[14px] border border-[#C9D8F6] bg-[#EFF5FF] px-3 py-2.5">
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-[0_6px_14px_-10px_rgba(37,99,235,0.45)]">
                  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0 text-[#2563EB]" fill="currentColor" aria-hidden>
                    <path d="m12 2 7 2.4V11c0 4.1-2.8 7.7-7 9-4.2-1.3-7-4.9-7-9V4.4L12 2Z" />
                    <path d="m12 14.8-3.2-3.2 1.5-1.5 1.7 1.7 3.7-3.7 1.5 1.5-5.2 5.2Z" fill="#93C5FD" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <p className="text-[16px] font-black leading-none tracking-tight text-eid-fg sm:text-[18px]">Tudo pronto para criar sua formação!</p>
                  <p className="mt-1 text-[10px] leading-snug text-[#556987]">
                    Revise as informações acima antes de criar. Após criar, você poderá gerenciar sua formação na plataforma.
                  </p>
                </div>
              </div>
              <button
                type="submit"
                disabled={createPending}
                className="mt-2.5 inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded-[12px] border border-[#F97316] bg-[#FF6A00] px-4 text-[11px] font-black uppercase tracking-[0.03em] text-white shadow-[0_10px_20px_-14px_rgba(249,115,22,0.8)] transition hover:brightness-105 disabled:opacity-60"
              >
                {createPending ? (
                  <>
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" aria-hidden />
                    <span className="animate-pulse">Criando...</span>
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                      <path d="M7 3h10l1 2h2v2H4V5h2l1-2Zm1 7h8v9H8v-9Zm2 2v5h4v-5h-4Z" />
                    </svg>
                    <span>{convidarUsuarioIdAposCriar ? "Criar e enviar convite" : "Criar formação e abrir gestão"}</span>
                  </>
                )}
              </button>
              <p className="mt-2 inline-flex items-start gap-1.5 text-[10px] text-[#5D76A3]">
                <svg viewBox="0 0 16 16" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#2563EB]" fill="currentColor" aria-hidden>
                  <path d="M8 1.2a6.8 6.8 0 1 0 0 13.6A6.8 6.8 0 0 0 8 1.2Zm3.2 4.4-3.6 4L4.8 7.4l1-1 1.6 1.6 2.8-3 1 .8Z" />
                </svg>
                <span>Você será o líder da formação e poderá aprovar ou recusar candidatos. Todas as alterações poderão ser feitas na gestão da formação.</span>
              </p>
            </div>
          ) : (
          <button
            type="submit"
            disabled={createPending}
            className="rounded-xl border border-eid-primary-500/45 bg-eid-primary-500/22 px-4 py-2.5 text-sm font-black uppercase tracking-[0.08em] text-eid-fg transition-all duration-200 hover:-translate-y-[1px] hover:border-eid-primary-500/65 hover:bg-eid-primary-500/30 disabled:opacity-60 sm:col-span-2"
          >
            {createPending
              ? "Criando…"
              : convidarUsuarioIdAposCriar
                ? "Criar e enviar convite"
                : "Criar formação e abrir gestão"}
          </button>
          )}
          {createState.message ? (
            <p
              className={`text-xs sm:col-span-2 ${createState.ok ? "text-eid-primary-700 dark:text-eid-primary-300" : "text-red-700 dark:text-red-300"}`}
            >
              {createState.message}
            </p>
          ) : null}
        </form>
    </>
  );

  const inviteBody = isConvidarStyle ? (
    <div className="rounded-[16px] border border-[color:var(--eid-border-subtle)] bg-eid-card p-3">
      <p className="text-[13px] font-black text-eid-fg">Convidar atleta por @username</p>
      <form action={inviteAction} className={`mt-3 grid gap-2 ${panelMode === "invite" ? "" : "mt-3"}`}>
        <input type="hidden" name="convidado_usuario_id" value={pickedInviteUserId ?? ""} />
        <label className="grid gap-1">
          <span className="text-[11px] font-black uppercase tracking-[0.03em] text-eid-fg">Selecione a equipe</span>
          <div className="flex items-center gap-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card px-3">
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-[#64748B]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="m12 2 7 2.4V11c0 4.1-2.8 7.7-7 9-4.2-1.3-7-4.9-7-9V4.4L12 2Z" />
              <path d="m12 7.2 1.5 3 3.3.5-2.4 2.3.6 3.3-3-1.6-3 1.6.6-3.3-2.4-2.3 3.3-.5 1.5-3Z" />
            </svg>
            <select
              name="time_id"
              required
              value={inviteTeamId}
              onChange={(e) => setInviteTeamId(e.target.value)}
              className="h-11 w-full bg-transparent text-[12px] text-eid-fg focus:outline-none"
            >
              <option value="">Selecione a equipe</option>
              {minhasEquipes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome} ({(t.tipo ?? "time").toUpperCase()} · {t.esporteNome})
                </option>
              ))}
            </select>
          </div>
        </label>
        <label className="grid gap-1">
          <span className="text-[11px] font-black uppercase tracking-[0.03em] text-eid-fg">@username do atleta</span>
          <div className="relative flex items-center gap-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card px-3">
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-[#64748B]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="12" cy="12" r="8" />
              <path d="M8.5 14.8c.8-1.6 2-2.4 3.5-2.4s2.7.8 3.5 2.4" />
              <path d="M9.8 9.8h4.4" />
            </svg>
            <input
              name="username"
              required={!pickedInviteUserId}
              value={inviteQuery}
              onChange={(e) => {
                setPickedInviteUserId(null);
                setInviteQuery(e.target.value);
              }}
              onFocus={() => {
                if (inviteSuggestions.length > 0 && !pickedInviteUserId) setInviteSuggestOpen(true);
              }}
              onBlur={() => {
                window.setTimeout(() => setInviteSuggestOpen(false), 180);
              }}
              placeholder="@username do atleta (3 letras para sugerir)"
              autoComplete="off"
              className="h-11 w-full bg-transparent text-[12px] text-eid-fg placeholder:text-[#64748B] focus:outline-none"
            />
            {inviteSuggestLoading ? (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#64748B]">Buscando...</span>
            ) : null}
            {inviteSuggestOpen && inviteSuggestions.length > 0 ? (
              <ul className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-auto rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card py-1 shadow-lg">
                {inviteSuggestions.map((it) => (
                  <li key={it.id}>
                    <button
                      type="button"
                      className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-eid-surface/60"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setPickedInviteUserId(it.id);
                        setInviteQuery(it.subtitle ? `${it.title} (${it.subtitle})` : it.title);
                        setInviteSuggestOpen(false);
                        setInviteSuggestions([]);
                      }}
                    >
                      <span className="text-[12px] font-semibold text-eid-fg">{it.title}</span>
                      {it.subtitle ? <span className="text-[10px] text-[#64748B]">{it.subtitle}</span> : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </label>
        <button
          type="submit"
          disabled={invitePending}
          className="mt-1 inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-[12px] border border-[#2563EB] bg-[linear-gradient(90deg,#1D4ED8,#2563EB)] px-4 text-[12px] font-black uppercase tracking-[0.03em] text-white shadow-[0_10px_18px_-14px_rgba(37,99,235,0.8)] transition hover:brightness-105 disabled:opacity-60"
        >
          {invitePending ? (
            <>
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" aria-hidden />
              <span className="animate-pulse">Convidando...</span>
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="m22 2-10 10" />
                <path d="m22 2-6 20-4-9-9-4 19-7Z" />
              </svg>
              <span>Convidar</span>
            </>
          )}
        </button>
        {inviteState.message ? (
          <p className={`text-xs ${inviteState.ok ? "text-eid-primary-700 dark:text-eid-primary-300" : "text-red-700 dark:text-red-300"}`}>
            {inviteState.message}
          </p>
        ) : null}
      </form>
    </div>
  ) : (
    <form action={inviteAction} className={`grid gap-2 sm:grid-cols-[1fr_1fr_auto] ${panelMode === "invite" ? "" : "mt-3"}`}>
      <select name="time_id" required className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg">
        <option value="">Selecione a equipe</option>
        {minhasEquipes.map((t) => (
          <option key={t.id} value={t.id}>
            {t.nome} ({(t.tipo ?? "time").toUpperCase()} · {t.esporteNome})
          </option>
        ))}
      </select>
      <input name="username" required placeholder="@username do atleta" className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg" />
      <EidInviteButton type="submit" loading={invitePending} label="Convidar" className="rounded-xl px-4 py-2 text-sm" />
      {inviteState.message ? (
        <p
          className={`text-xs sm:col-span-3 ${inviteState.ok ? "text-eid-primary-700 dark:text-eid-primary-300" : "text-red-700 dark:text-red-300"}`}
        >
          {inviteState.message}
        </p>
      ) : null}
    </form>
  );

  const createHeader = (
    <div className="border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2 text-sm font-semibold text-eid-fg">
      Criar nova dupla ou time
    </div>
  );
  const inviteHeader = (
    <div className="border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2 text-sm font-semibold text-eid-fg">
      Convidar atleta por @username
    </div>
  );

  return (
    <section className="mb-4 min-w-0 space-y-3">
      {showCreate ? (
        panelMode === "create" ? (
          <div className="eid-surface-panel overflow-hidden rounded-2xl p-0">
            {createHeader}
            <div className="p-3 sm:p-4">{createBody}</div>
          </div>
        ) : (
          <details className="eid-surface-panel overflow-hidden rounded-2xl p-0" open={defaultOpenCreate}>
            <summary className="cursor-pointer border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2 text-sm font-semibold text-eid-fg">
              Criar nova dupla ou time
            </summary>
            <div className="p-3 sm:p-4">{createBody}</div>
          </details>
        )
      ) : null}

      {showInviteBlock ? (
        panelMode === "invite" ? (
          isConvidarStyle ? (
            <div className="p-0">{inviteBody}</div>
          ) : (
          <div className="eid-surface-panel overflow-hidden rounded-2xl p-0">
            {inviteHeader}
            <div className="p-3 sm:p-4">{inviteBody}</div>
          </div>
          )
        ) : (
          <details className="eid-surface-panel overflow-hidden rounded-2xl p-0">
            <summary className="cursor-pointer border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2 text-sm font-semibold text-eid-fg">
              Convidar atleta por @username
            </summary>
            <div className="p-3 sm:p-4">{inviteBody}</div>
          </details>
        )
      ) : null}
    </section>
  );
}
