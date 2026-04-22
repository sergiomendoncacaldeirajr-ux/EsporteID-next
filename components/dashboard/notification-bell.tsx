"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Preview = { id: number; mensagem: string; lida: boolean; data_criacao: string | null; criada_em: string | null };

function IconBell({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
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

export function NotificationBell({ userId }: { userId: string | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [total, setTotal] = useState(0);
  const [preview, setPreview] = useState<Preview[]>([]);
  const [agendaN, setAgendaN] = useState(0);
  const [matchN, setMatchN] = useState(0);
  const [placarN, setPlacarN] = useState(0);

  const load = useCallback(async () => {
    if (!userId) return;
    const supabase = createClient();
    const [notifRes, listRes, agRes, mRes, pRes] = await Promise.all([
      supabase.from("notificacoes").select("id", { count: "exact", head: true }).eq("usuario_id", userId).eq("lida", false),
      supabase
        .from("notificacoes")
        .select("id, mensagem, lida, data_criacao, criada_em")
        .eq("usuario_id", userId)
        .order("data_criacao", { ascending: false, nullsFirst: false })
        .limit(6),
      supabase
        .from("partidas")
        .select("id", { count: "exact", head: true })
        .or(`jogador1_id.eq.${userId},jogador2_id.eq.${userId}`)
        .eq("status", "agendada"),
      supabase.from("matches").select("id", { count: "exact", head: true }).eq("adversario_id", userId).eq("status", "Pendente"),
      supabase
        .from("partidas")
        .select("id", { count: "exact", head: true })
        .or(`jogador1_id.eq.${userId},jogador2_id.eq.${userId}`)
        .eq("status", "aguardando_confirmacao")
        .neq("lancado_por", userId),
    ]);
    const unread = notifRes.count ?? 0;
    const ag = agRes.count ?? 0;
    const m = mRes.count ?? 0;
    const p = pRes.count ?? 0;
    setAgendaN(ag);
    setMatchN(m);
    setPlacarN(p);
    setTotal(unread + m + p + ag);
    setPreview((listRes.data ?? []) as Preview[]);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load, pathname]);

  useEffect(() => {
    if (!userId) return;
    const t = window.setInterval(() => void load(), 90000);
    return () => window.clearInterval(t);
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

  if (!userId) return null;

  const bellCount = total;

  return (
    <div className="relative shrink-0" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/55 text-eid-text-secondary shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition hover:border-[color:var(--eid-border)] hover:bg-eid-surface/75 hover:text-eid-fg md:h-9 md:w-9"
        aria-label="Notificações e resumos"
        aria-expanded={open}
      >
        <IconBell className="h-4.5 w-4.5" />
        {bellCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-eid-action-500 px-1 text-[9px] font-black text-[var(--eid-brand-ink)] shadow-md">
            {bellCount > 99 ? "99+" : bellCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="fixed left-1/2 top-[var(--eid-shell-header-offset)] z-[70] w-[min(94vw,340px)] -translate-x-1/2 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-3 shadow-xl shadow-black/40 md:absolute md:left-auto md:right-0 md:top-[calc(100%+8px)] md:w-[min(100vw-2rem,340px)] md:translate-x-0">
          <p className="border-b border-[color:var(--eid-border-subtle)] pb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-eid-text-secondary">
            Resumo rápido
          </p>
          <ul className="mt-2 space-y-2 text-sm">
            <li className="flex justify-between gap-2 rounded-xl bg-eid-surface/80 px-3 py-2">
              <span className="text-eid-text-secondary">Agenda (jogos agendados)</span>
              <Link href="/agenda" className="font-bold tabular-nums text-eid-fg hover:text-eid-primary-300" onClick={() => setOpen(false)}>
                {agendaN}
              </Link>
            </li>
            <li className="flex justify-between gap-2 rounded-xl bg-eid-surface/80 px-3 py-2">
              <span className="text-eid-text-secondary">Social (pedidos)</span>
              <Link
                href="/comunidade"
                className="font-bold tabular-nums text-eid-fg hover:text-eid-primary-300"
                onClick={() => setOpen(false)}
              >
                {matchN}
              </Link>
            </li>
            <li className="flex justify-between gap-2 rounded-xl bg-eid-surface/80 px-3 py-2">
              <span className="text-eid-text-secondary">Placar aguardando você</span>
              <Link
                href="/agenda#placares"
                className="font-bold tabular-nums text-eid-fg hover:text-eid-primary-300"
                onClick={() => setOpen(false)}
              >
                {placarN}
              </Link>
            </li>
          </ul>

          <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.12em] text-eid-text-secondary">Últimas notificações</p>
          {preview.length === 0 ? (
            <p className="mt-2 text-xs text-eid-text-secondary">Nada recente.</p>
          ) : (
            <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto pr-1">
              {preview.map((n) => (
                <li key={n.id} className="rounded-lg border border-[color:var(--eid-border-subtle)] px-2 py-1.5 text-xs">
                  <p className={`line-clamp-2 ${n.lida ? "text-eid-text-secondary" : "font-medium text-eid-fg"}`}>{n.mensagem}</p>
                  <p className="mt-0.5 text-[10px] text-eid-text-secondary">{formatShort(n.data_criacao ?? n.criada_em)}</p>
                </li>
              ))}
            </ul>
          )}

          <Link
            href="/comunidade#notificacoes"
            className="mt-3 flex min-h-[40px] items-center justify-center rounded-xl bg-eid-primary-500/15 text-xs font-bold text-eid-primary-300 hover:bg-eid-primary-500/25"
            onClick={() => setOpen(false)}
          >
            Abrir central Social
          </Link>
        </div>
      ) : null}
    </div>
  );
}
