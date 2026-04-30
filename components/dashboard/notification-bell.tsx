"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  disablePushNotifications,
  enablePushNotifications,
  hasActivePushSubscription,
} from "@/lib/pwa/push-client";

type Preview = {
  id: number;
  mensagem: string;
  lida: boolean;
  data_criacao: string | null;
  criada_em: string | null;
  tipo: string | null;
  referencia_id: number | null;
};
type UnreadNotif = {
  id: number;
  tipo: string | null;
  referencia_id: number | null;
  remetente_id: string | null;
};

function isFlowActionNotif(tipoRaw: string | null | undefined): boolean {
  const tipo = String(tipoRaw ?? "")
    .trim()
    .toLowerCase();
  return tipo === "match" || tipo === "desafio";
}

function isCancelamentoFlowMensagem(raw: string | null | undefined): boolean {
  const msg = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (!msg) return false;
  return msg.includes("cancelado") || msg.includes("cancelamento");
}

function IconBell({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width={24} height={24} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M18 8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.73 21a2 2 0 01-3.46 0" strokeLinecap="round" />
    </svg>
  );
}

function formatShort(iso: string | null | undefined) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

const PREVIEW_LIMIT = 3;
const PREVIEW_FETCH = 80;

function SummaryGlyph({ kind }: { kind: "agenda" | "social" | "placar" }) {
  const wrapClass =
    kind === "agenda"
      ? "bg-eid-primary-500/10 text-eid-primary-500"
      : kind === "social"
        ? "bg-eid-action-500/10 text-eid-action-500"
        : "bg-violet-500/12 text-violet-500";
  return (
    <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${wrapClass}`}>
      {kind === "agenda" ? (
        <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill="none" aria-hidden>
          <rect x="4" y="6" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
          <path d="M8 3v4M16 3v4M4 10h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ) : kind === "social" ? (
        <svg viewBox="0 0 24 24" width={17} height={17} className="shrink-0" fill="none" aria-hidden>
          <path d="M6 7h12a2 2 0 012 2v7l-4-2H6a2 2 0 01-2-2V9a2 2 0 012-2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <circle cx="9" cy="11.5" r="1" fill="currentColor" />
          <circle cx="12" cy="11.5" r="1" fill="currentColor" />
          <circle cx="15" cy="11.5" r="1" fill="currentColor" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width={17} height={17} className="shrink-0" fill="none" aria-hidden>
          <path d="M12 21s6-5.2 6-10a6 6 0 10-12 0c0 4.8 6 10 6 10z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <circle cx="12" cy="11" r="2" fill="currentColor" />
        </svg>
      )}
    </span>
  );
}

export function NotificationBell({ userId }: { userId: string | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const bellBtnRef = useRef<HTMLButtonElement>(null);
  const [total, setTotal] = useState(0);
  const [preview, setPreview] = useState<Preview[]>([]);
  const [agendaN, setAgendaN] = useState(0);
  const [pedidosDesafioN, setPedidosDesafioN] = useState(0);
  const [sugestoesLiderN, setSugestoesLiderN] = useState(0);
  const [placarN, setPlacarN] = useState(0);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const vapidPublicKey = useMemo(() => String(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "").trim(), []);

  const load = useCallback(async () => {
    if (!userId) return;
    const supabase = createClient();
    const [notifRes, listRes, agRes, mRes, sRes, pRes] = await Promise.all([
      supabase
        .from("notificacoes")
        .select("id, tipo, referencia_id, remetente_id")
        .eq("usuario_id", userId)
        .eq("lida", false)
        .limit(300),
      supabase
        .from("notificacoes")
        .select("id, mensagem, lida, data_criacao, criada_em, tipo, referencia_id")
        .eq("usuario_id", userId)
        .order("data_criacao", { ascending: false, nullsFirst: false })
        .limit(PREVIEW_FETCH),
      supabase
        .from("partidas")
        .select("id, match_id")
        .or(`jogador1_id.eq.${userId},jogador2_id.eq.${userId}`)
        .eq("status", "agendada"),
      supabase.from("matches").select("id", { count: "exact", head: true }).eq("adversario_id", userId).eq("status", "Pendente"),
      supabase
        .from("match_sugestoes")
        .select("id", { count: "exact", head: true })
        .eq("alvo_dono_id", userId)
        .eq("status", "pendente"),
      supabase
        .from("partidas")
        .select("id", { count: "exact", head: true })
        .or(`jogador1_id.eq.${userId},jogador2_id.eq.${userId}`)
        .eq("status", "aguardando_confirmacao")
        .neq("lancado_por", userId),
    ]);
    const unreadRowsAll = (notifRes.data ?? []) as UnreadNotif[];
    const previewRowsAll = (listRes.data ?? []) as Preview[];
    const cancelFlowNotifIds = new Set(
      previewRowsAll
        .filter((n) => isFlowActionNotif(n.tipo) && isCancelamentoFlowMensagem(n.mensagem))
        .map((n) => Number(n.id))
        .filter((id) => Number.isFinite(id) && id > 0)
    );
    const flowRefIds = [
      ...new Set(
        [...unreadRowsAll, ...previewRowsAll]
          .filter((n) => isFlowActionNotif((n as { tipo?: string | null }).tipo))
          .map((n) => Number((n as { referencia_id?: number | null }).referencia_id ?? 0))
          .filter((id) => Number.isFinite(id) && id > 0)
      ),
    ];
    const suggestionResolvedRefIds = new Set<number>();
    if (flowRefIds.length > 0) {
      const { data: sugRows } = await supabase
        .from("match_sugestoes")
        .select("id, status")
        .in("id", flowRefIds);
      for (const row of sugRows ?? []) {
        const id = Number(row.id ?? 0);
        const status = String(row.status ?? "").trim().toLowerCase();
        if (!Number.isFinite(id) || id <= 0) continue;
        if (status === "aprovado" || status === "recusado") {
          suggestionResolvedRefIds.add(id);
        }
      }
    }
    const canceledMatchIds = new Set<number>();
    if (flowRefIds.length > 0) {
      const { data: statusRows } = await supabase.from("matches").select("id, status").in("id", flowRefIds);
      for (const row of statusRows ?? []) {
        if (String(row.status ?? "").trim().toLowerCase() === "cancelado") {
          canceledMatchIds.add(Number(row.id));
        }
      }
      if (canceledMatchIds.size > 0) {
        await supabase
          .from("notificacoes")
          .delete()
          .eq("usuario_id", userId)
          .in("tipo", ["match", "desafio"])
          .in("referencia_id", [...canceledMatchIds]);
      }
    }
    if (cancelFlowNotifIds.size > 0) {
      await supabase.from("notificacoes").delete().eq("usuario_id", userId).in("id", [...cancelFlowNotifIds]);
    }
    const agendaRows = (agRes.data ?? []) as Array<{ id: number; match_id?: number | null }>;
    const agendaMatchIds = [
      ...new Set(
        agendaRows
          .map((row) => Number(row.match_id ?? 0))
          .filter((id) => Number.isFinite(id) && id > 0)
      ),
    ];
    const agendaCancelados = new Set<number>();
    if (agendaMatchIds.length > 0) {
      const { data: agendaMatchRows } = await supabase.from("matches").select("id, status").in("id", agendaMatchIds);
      for (const row of agendaMatchRows ?? []) {
        if (String(row.status ?? "").trim().toLowerCase() === "cancelado") {
          agendaCancelados.add(Number(row.id));
        }
      }
    }
    const agendaRowsVisiveis = agendaRows.filter((row) => {
      const mid = Number(row.match_id ?? 0);
      return !(Number.isFinite(mid) && mid > 0 && agendaCancelados.has(mid));
    });
    const unreadRows = unreadRowsAll.filter((n) => {
      if (cancelFlowNotifIds.has(Number(n.id))) return false;
      if (!isFlowActionNotif(n.tipo)) return true;
      const refId = Number(n.referencia_id ?? 0);
      return !(Number.isFinite(refId) && refId > 0 && canceledMatchIds.has(refId));
    });
    const previewRows = previewRowsAll.filter((n) => {
      if (cancelFlowNotifIds.has(Number(n.id))) return false;
      if (!isFlowActionNotif(n.tipo)) return true;
      const refId = Number(n.referencia_id ?? 0);
      return !(Number.isFinite(refId) && refId > 0 && canceledMatchIds.has(refId));
    });
    const seen = new Set<string>();
    let unreadGeneral = 0;
    for (const n of unreadRows) {
      const isFlowAction = isFlowActionNotif(n.tipo);
      const key = isFlowAction
        ? `flow:${String(n.tipo ?? "").trim().toLowerCase()}:${String(n.referencia_id ?? "null")}`
        : `id:${n.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      // Notificações de fluxo resolvidas de sugestão (aprovado/recusado)
      // devem contar no sino para o usuário perceber a atualização.
      if (!isFlowAction) {
        unreadGeneral += 1;
      } else {
        const refId = Number(n.referencia_id ?? 0);
        if (Number.isFinite(refId) && refId > 0 && suggestionResolvedRefIds.has(refId)) {
          unreadGeneral += 1;
        }
      }
    }
    const ag = agendaRowsVisiveis.length;
    const m = mRes.count ?? 0;
    const s = sRes.count ?? 0;
    const p = pRes.count ?? 0;
    setAgendaN(ag);
    setPedidosDesafioN(m);
    setSugestoesLiderN(s);
    setPlacarN(p);
    // Inclui pedidos pendentes (matches) como ação social real.
    setTotal(unreadGeneral + p + ag + m + s);
    setPreview(previewRows);
  }, [userId]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(id);
  }, [load, pathname]);

  useEffect(() => {
    if (!userId) return;
    const t = window.setInterval(() => void load(), 20000);
    const onFocus = () => void load();
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(t);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [userId, load]);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`eid-notif-realtime-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notificacoes", filter: `usuario_id=eq.${userId}` },
        () => void load()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches", filter: `adversario_id=eq.${userId}` },
        () => void load()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "match_sugestoes", filter: `alvo_dono_id=eq.${userId}` },
        () => void load()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "partidas" },
        () => void load()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, load]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (!open) return;
    function updatePanelPos() {
      const rect = bellBtnRef.current?.getBoundingClientRect();
      if (!rect) return;
      const panelWidth = Math.min(window.innerWidth * 0.84, 280);
      const preferredLeft = rect.right - panelWidth + 10;
      const left = Math.max(6, Math.min(preferredLeft, window.innerWidth - panelWidth - 6));
      const top = rect.bottom + 4;
      setPanelPos({ top, left });
    }
    updatePanelPos();
    window.addEventListener("resize", updatePanelPos);
    window.addEventListener("scroll", updatePanelPos, true);
    return () => {
      window.removeEventListener("resize", updatePanelPos);
      window.removeEventListener("scroll", updatePanelPos, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      try {
        const active = await hasActivePushSubscription();
        if (!cancelled) setPushEnabled(active);
      } catch {
        if (!cancelled) setPushEnabled(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const onTogglePush = useCallback(async () => {
    if (pushBusy) return;
    setPushBusy(true);
    try {
      if (pushEnabled) {
        await disablePushNotifications();
        setPushEnabled(false);
      } else {
        await enablePushNotifications(vapidPublicKey);
        setPushEnabled(true);
      }
    } catch {
      // Falhas de permissão/chave são exibidas em outros pontos do app; aqui mantemos o CTA compacto.
    } finally {
      setPushBusy(false);
    }
  }, [pushBusy, pushEnabled, vapidPublicKey]);

  if (!userId) return null;

  const bellCount = total;

  return (
    <div className="relative shrink-0" ref={wrapRef}>
      <button
        ref={bellBtnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--eid-border-subtle)] bg-[color:color-mix(in_srgb,var(--eid-card)_92%,transparent)] text-eid-text-secondary shadow-none transition-all duration-200 ease-out hover:border-eid-primary-500/35 hover:text-eid-fg active:translate-y-[0.5px] active:scale-[0.985] md:h-9 md:w-9 [touch-action:manipulation]"
        aria-label="Notificações e resumos"
        aria-expanded={open}
      >
        <IconBell className="h-[18px] w-[18px] shrink-0 md:h-5 md:w-5" />
        {bellCount > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 flex h-[21px] min-w-[21px] items-center justify-center rounded-full bg-eid-action-500 px-1 text-[10px] font-black text-white shadow-[0_6px_14px_-8px_color-mix(in_srgb,var(--eid-action-500)_85%,transparent)] ring-2 ring-white">
            {bellCount > 99 ? "99+" : bellCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          data-eid-notif-modal="true"
          className="fixed z-[70] w-[min(84vw,280px)] overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-2 shadow-[0_20px_48px_-30px_rgba(15,23,42,0.55)]"
          style={{ top: `${panelPos.top}px`, left: `${panelPos.left}px` }}
        >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-eid-primary-500/10 text-eid-primary-500">
                  <IconBell className="h-3 w-3" />
                </span>
                <div>
                  <h2 className="text-[12px] font-black leading-none tracking-tight text-eid-fg">Central de notificações</h2>
                  <p className="mt-0.5 text-[9px] text-eid-text-secondary">Acompanhe tudo o que acontece</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-eid-text-secondary transition hover:bg-eid-surface/70 hover:text-eid-fg"
                aria-label="Fechar"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="mt-2.5 flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] pb-1.5">
              <span className="text-[10px] font-black uppercase tracking-[0.08em] text-eid-fg">Push</span>
              <button
                type="button"
                onClick={onTogglePush}
                disabled={pushBusy}
                className={`inline-flex min-h-[20px] items-center justify-center rounded-full border px-2 text-[7px] font-black uppercase tracking-[0.03em] transition ${
                  pushEnabled
                    ? "border-emerald-500/25 bg-emerald-500/12 text-emerald-400"
                    : "border-eid-primary-500/28 bg-eid-primary-500/10 text-eid-primary-400"
                } ${pushBusy ? "opacity-60" : ""}`}
              >
                {pushBusy ? "..." : pushEnabled ? "• Ativo" : "Ativar"}
              </button>
            </div>

            <p className="mt-2 text-[9px] font-black uppercase tracking-[0.08em] text-eid-fg">Resumo rápido</p>
            <ul className="mt-1.5 space-y-1.5">
              <li className="flex items-center justify-between rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/35 px-2 py-1.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <SummaryGlyph kind="agenda" />
                  <div>
                    <p className="text-[10px] font-bold text-eid-fg">Agenda</p>
                    <p className="text-[9px] text-eid-text-secondary">Jogos agendados</p>
                  </div>
                </div>
                <Link href="/agenda" className="text-[18px] font-black leading-none text-eid-primary-500" onClick={() => setOpen(false)}>
                  {agendaN}
                </Link>
              </li>
              <li className="flex items-center justify-between rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/35 px-2 py-1.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <SummaryGlyph kind="social" />
                  <div>
                    <p className="text-[10px] font-bold text-eid-fg">Social</p>
                    <p className="text-[9px] text-eid-text-secondary">Pedidos recebidos</p>
                  </div>
                </div>
                <Link href="/comunidade" className="text-[18px] font-black leading-none text-eid-action-500" onClick={() => setOpen(false)}>
                  {pedidosDesafioN + sugestoesLiderN}
                </Link>
              </li>
              <li className="flex items-center justify-between rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/35 px-2 py-1.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <SummaryGlyph kind="placar" />
                  <div>
                    <p className="text-[10px] font-bold text-eid-fg">Placar</p>
                    <p className="text-[9px] text-eid-text-secondary">Aguardando você</p>
                  </div>
                </div>
                <Link href="/agenda#placares" className="text-[18px] font-black leading-none text-violet-500" onClick={() => setOpen(false)}>
                  {placarN}
                </Link>
              </li>
            </ul>

            <p className="mt-2 border-t border-[color:var(--eid-border-subtle)] pt-2 text-[9px] font-black uppercase tracking-[0.08em] text-eid-fg">
              Últimas notificações
            </p>
            {preview.length === 0 ? (
              <div className="mt-1.5 flex flex-col items-center rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/25 px-2.5 py-3 text-center">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-eid-primary-500/10 text-eid-primary-400">
                  <IconBell className="h-5 w-5" />
                </span>
                <p className="mt-1.5 text-[11px] font-black text-eid-fg">Nada recente por aqui</p>
                <p className="mt-1 text-[9px] text-eid-text-secondary">Quando houver novidades, você verá aqui.</p>
              </div>
            ) : (
              <ul className="mt-1.5 max-h-40 space-y-1.5 overflow-y-auto pr-1">
                {preview.slice(0, PREVIEW_LIMIT).map((n) => (
                  <li key={n.id} className="rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/25 px-2 py-1.5">
                    <p className={`line-clamp-2 text-[10px] ${n.lida ? "text-eid-text-secondary" : "font-semibold text-eid-fg"}`}>{n.mensagem}</p>
                    <p className="mt-1 text-[9px] text-eid-text-secondary">{formatShort(n.data_criacao ?? n.criada_em)}</p>
                  </li>
                ))}
              </ul>
            )}

            <Link
              href="/comunidade#notificacoes"
              className="mt-2 inline-flex min-h-[30px] w-full items-center justify-center rounded-lg border border-eid-primary-500/25 bg-eid-primary-500/14 px-2.5 text-[10px] font-black text-eid-primary-500 transition hover:bg-eid-primary-500/20"
              onClick={() => setOpen(false)}
            >
              <span className="inline-flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
                  <path d="M14 5h5v5M10 14L19 5M19 14v5h-5M5 10V5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                Abrir Central Social
              </span>
            </Link>
        </div>
      ) : null}
    </div>
  );
}
