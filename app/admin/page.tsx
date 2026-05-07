import {
  Activity,
  Bell,
  Calendar,
  Flag,
  MapPin,
  Swords,
  Target,
  Users,
  Users2,
} from "lucide-react";
import { adminDispararPushTesteParaUsuario, adminMarcarAlertaLido } from "@/app/admin/actions";
import { AdminPushUsuarioPicker } from "@/components/admin/admin-push-usuario-picker";
import { isPushDispatchConfigured } from "@/lib/pwa/push-dispatch";
import { createServiceRoleClient, hasServiceRoleConfig } from "@/lib/supabase/service-role";

type Alerta = {
  id: number;
  tipo: string;
  titulo: string;
  corpo: string | null;
  payload_json: Record<string, unknown> | null;
  lido: boolean;
  criado_em: string;
};

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function parseAdminPushDebug(sp: Record<string, string | string[] | undefined>) {
  const num = (key: string) => {
    const raw = sp[key];
    const s0 = Array.isArray(raw) ? raw[0] : raw;
    const s = typeof s0 === "string" ? s0.trim() : "";
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };
  const str = (key: string) => {
    const v = sp[key];
    const s = Array.isArray(v) ? v[0] : v;
    return typeof s === "string" ? s : "";
  };
  return {
    sent: num("pds"),
    failed: num("pdf"),
    noDevice: num("pdn"),
    attempted: num("pda") === 1,
    skip: str("psk") || "ok",
    errDetail: str("pde") || null,
  };
}

const STAT_CARDS = [
  {
    key: "profiles",
    label: "Perfis",
    href: "/admin/usuarios",
    Icon: Users,
    colorBg: "bg-blue-500/10",
    colorBorder: "border-blue-500/20",
    colorIcon: "text-blue-400",
    colorHover: "hover:border-blue-500/35",
  },
  {
    key: "torneios",
    label: "Torneios",
    href: "/admin/torneios",
    Icon: Calendar,
    colorBg: "bg-purple-500/10",
    colorBorder: "border-purple-500/20",
    colorIcon: "text-purple-400",
    colorHover: "hover:border-purple-500/35",
  },
  {
    key: "times",
    label: "Equipes",
    href: "/admin/equipes",
    Icon: Users2,
    colorBg: "bg-emerald-500/10",
    colorBorder: "border-emerald-500/20",
    colorIcon: "text-emerald-400",
    colorHover: "hover:border-emerald-500/35",
  },
  {
    key: "espacos",
    label: "Locais",
    href: "/admin/locais",
    Icon: MapPin,
    colorBg: "bg-orange-500/10",
    colorBorder: "border-orange-500/20",
    colorIcon: "text-orange-400",
    colorHover: "hover:border-orange-500/35",
  },
  {
    key: "partidas",
    label: "Partidas",
    href: "/admin/partidas",
    Icon: Swords,
    colorBg: "bg-indigo-500/10",
    colorBorder: "border-indigo-500/20",
    colorIcon: "text-indigo-400",
    colorHover: "hover:border-indigo-500/35",
  },
  {
    key: "matches",
    label: "Pedidos",
    href: "/admin/matches",
    Icon: Target,
    colorBg: "bg-amber-500/10",
    colorBorder: "border-amber-500/20",
    colorIcon: "text-amber-400",
    colorHover: "hover:border-amber-500/35",
  },
  {
    key: "denuncias",
    label: "Denúncias",
    href: "/admin/denuncias",
    Icon: Flag,
    colorBg: "bg-rose-500/10",
    colorBorder: "border-rose-500/20",
    colorIcon: "text-rose-400",
    colorHover: "hover:border-rose-500/35",
  },
  {
    key: "social_ops",
    label: "Notificações",
    href: "/admin/operacoes-sociais",
    Icon: Bell,
    colorBg: "bg-teal-500/10",
    colorBorder: "border-teal-500/20",
    colorIcon: "text-teal-400",
    colorHover: "hover:border-teal-500/35",
  },
  {
    key: "eids",
    label: "EIDs",
    href: "/admin/eid",
    Icon: Activity,
    colorBg: "bg-cyan-500/10",
    colorBorder: "border-cyan-500/20",
    colorIcon: "text-cyan-400",
    colorHover: "hover:border-cyan-500/35",
  },
] as const;

export default async function AdminHomePage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const flash = typeof sp.adm_flash === "string" ? sp.adm_flash : "";
  const pushUserId = typeof sp.push_user === "string" ? sp.push_user.trim() : "";
  const pushDbg =
    flash === "push_teste_ok" &&
    ["pds", "pdf", "pdn", "pda", "psk", "pde"].some((k) => typeof sp[k] === "string")
      ? parseAdminPushDebug(sp)
      : null;

  let counts: Record<string, number | null> = {
    profiles: null,
    torneios: null,
    times: null,
    espacos: null,
    partidas: null,
    matches: null,
    social_ops: null,
    denuncias: null,
    denuncias_abertas: null,
    eids: null,
    reivindicacoes_pendentes: null,
  };
  let alertas: Alerta[] = [];
  let pushDiag: {
    userId: string;
    subsAtivas: number;
    subsTotais: number;
    ultimasEntregas: { status: string | null; erro: string | null; enviadoEm: string | null; notifId: number | null }[];
    ultimosErros: { status: string | null; erro: string | null; enviadoEm: string | null; notifId: number | null }[];
    checklist: string[];
  } | null = null;

  if (hasServiceRoleConfig()) {
    try {
      const db = createServiceRoleClient();
      const [p, t, tm, e, pa, m, nNotif, d, dAbertas, eid, al, reivPend] = await Promise.all([
        db.from("profiles").select("id", { count: "exact", head: true }),
        db.from("torneios").select("id", { count: "exact", head: true }),
        db.from("times").select("id", { count: "exact", head: true }),
        db.from("espacos_genericos").select("id", { count: "exact", head: true }),
        db.from("partidas").select("id", { count: "exact", head: true }),
        db.from("matches").select("id", { count: "exact", head: true }),
        db.from("notificacoes").select("id", { count: "exact", head: true }),
        db.from("denuncias").select("id", { count: "exact", head: true }),
        db.from("denuncias").select("id", { count: "exact", head: true }).in("status", ["aberta", "em_analise"]),
        db.from("usuario_eid").select("id", { count: "exact", head: true }),
        db
          .from("admin_alertas")
          .select("id, tipo, titulo, corpo, payload_json, lido, criado_em")
          .eq("lido", false)
          .order("criado_em", { ascending: false })
          .limit(20),
        db.from("espaco_reivindicacoes").select("id", { count: "exact", head: true }).eq("status", "pendente"),
      ]);
      counts = {
        profiles: p.count ?? 0,
        torneios: t.count ?? 0,
        times: tm.count ?? 0,
        espacos: e.count ?? 0,
        partidas: pa.count ?? 0,
        matches: m.count ?? 0,
        social_ops: nNotif.count ?? 0,
        denuncias: d.count ?? 0,
        denuncias_abertas: dAbertas.count ?? 0,
        eids: eid.count ?? 0,
        reivindicacoes_pendentes: reivPend.count ?? 0,
      };
      alertas = (al.data ?? []) as Alerta[];

      if (pushUserId) {
        const { data: subsRows } = await db
          .from("push_subscriptions")
          .select("id, ativo")
          .eq("usuario_id", pushUserId)
          .order("id", { ascending: false })
          .limit(40);
        const subs = (subsRows ?? []) as Array<{ id: number; ativo?: boolean | null }>;
        const subIds = new Set(subs.map((s) => Number(s.id)).filter((n) => Number.isFinite(n) && n > 0));
        const { data: entregaRows } =
          subIds.size > 0
            ? await db
                .from("push_entregas_notificacao")
                .select("notificacao_id, status, ultimo_erro, enviado_em, subscription_id")
                .in("subscription_id", [...subIds])
                .order("id", { ascending: false })
                .limit(80)
            : { data: [] as unknown[] };
        const entregas = (entregaRows ?? []).map((r) => ({
          status: (r as { status?: string | null }).status ?? null,
          erro: (r as { ultimo_erro?: string | null }).ultimo_erro ?? null,
          enviadoEm: (r as { enviado_em?: string | null }).enviado_em ?? null,
          notifId: Number((r as { notificacao_id?: number | null }).notificacao_id ?? 0) || null,
        }));
        const ultimasEntregas = entregas.slice(0, 8);
        const hasSuccess = ultimasEntregas.some((e) => String(e.status ?? "").toLowerCase() === "success");
        const has410or404 = entregas.some((e) => {
          const er = String(e.erro ?? "").toLowerCase();
          return er.includes("410") || er.includes("404");
        });
        const checklist: string[] = [];
        if (!isPushDispatchConfigured())
          checklist.push("Chaves VAPID incompletas — nenhum Web Push será enviado. Veja Admin → Push.");
        if (subs.length === 0) checklist.push("Sem subscription cadastrada para este usuário.");
        if (subs.length > 0 && subs.filter((s) => s.ativo !== false).length === 0)
          checklist.push("Subscriptions existem, mas nenhuma está ativa.");
        if (has410or404) checklist.push("Há erro 410/404 em envio anterior (subscription expirada).");
        if (!hasSuccess && ultimasEntregas.length > 0)
          checklist.push("Sem sucesso recente de entrega para este usuário.");
        if (hasSuccess) checklist.push("Há entrega com sucesso recente: canal push operacional.");
        pushDiag = {
          userId: pushUserId,
          subsAtivas: subs.filter((s) => s.ativo !== false).length,
          subsTotais: subs.length,
          ultimasEntregas,
          ultimosErros: entregas.filter((e) => e.status !== "success").slice(0, 8),
          checklist,
        };
      }
    } catch {
      /* service key inválida */
    }
  }

  const hoje = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-eid-fg">Visão Geral</h2>
          <p className="mt-0.5 text-[12px] capitalize text-eid-text-secondary">{hoje}</p>
        </div>
      </div>

      {/* Priority alerts */}
      {((counts.reivindicacoes_pendentes ?? 0) > 0 || (counts.denuncias_abertas ?? 0) > 0) && (
        <div className="space-y-2">
          {(counts.reivindicacoes_pendentes ?? 0) > 0 && (
            <a
              href="/admin/locais#reivindicacoes"
              className="flex items-center justify-between rounded-2xl border border-eid-primary-500/35 bg-eid-primary-500/10 px-4 py-3 transition hover:border-eid-primary-500/55"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-eid-primary-500 text-[10px] font-black text-white">
                  {counts.reivindicacoes_pendentes}
                </span>
                <span className="text-sm font-semibold text-eid-primary-100">
                  {counts.reivindicacoes_pendentes} reivindicação(ões) de local aguardando aprovação
                </span>
              </div>
              <span className="shrink-0 text-xs font-bold uppercase tracking-wide text-eid-primary-300">
                Revisar →
              </span>
            </a>
          )}
          {(counts.denuncias_abertas ?? 0) > 0 && (
            <a
              href="/admin/denuncias"
              className="flex items-center justify-between rounded-2xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 transition hover:border-amber-400/50"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-[10px] font-black text-white">
                  {counts.denuncias_abertas}
                </span>
                <span className="text-sm font-semibold text-amber-100">
                  {counts.denuncias_abertas} denúncia(s) aguardando análise
                </span>
              </div>
              <span className="shrink-0 text-xs font-bold uppercase tracking-wide text-amber-200">Abrir →</span>
            </a>
          )}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {STAT_CARDS.map(({ key, label, href, Icon, colorBg, colorBorder, colorIcon, colorHover }) => (
          <a
            key={key}
            href={href}
            className={`group flex items-center gap-3 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4 shadow-sm transition hover:shadow-md ${colorHover}`}
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${colorBorder} ${colorBg}`}
            >
              <Icon className={`h-5 w-5 ${colorIcon}`} strokeWidth={1.75} aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-black tabular-nums text-eid-fg">
                {counts[key] != null ? counts[key]!.toLocaleString("pt-BR") : "—"}
              </p>
              <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-eid-text-secondary">
                {label}
              </p>
            </div>
          </a>
        ))}
      </div>

      {/* Admin alerts */}
      {alertas.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <h3 className="text-sm font-bold text-eid-fg">Alertas não lidos</h3>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500/20 text-[10px] font-black text-rose-300">
              {alertas.length}
            </span>
          </div>
          <ul className="space-y-2">
            {alertas.map((a) => {
              const payload = a.payload_json ?? {};
              const alvo = typeof payload.alvo_usuario_id === "string" ? payload.alvo_usuario_id : null;
              const usuarioVer = typeof payload.usuario_id === "string" ? payload.usuario_id : null;
              return (
                <li
                  key={a.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/80 p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-eid-text-muted">
                      {a.tipo}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-eid-fg">{a.titulo}</p>
                    {a.corpo && <p className="mt-1 text-xs leading-snug text-eid-text-secondary">{a.corpo}</p>}
                    <p className="mt-1.5 text-[10px] text-eid-text-muted">
                      {new Date(a.criado_em).toLocaleString("pt-BR")}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {alvo && (
                        <a
                          href={`/admin/usuarios/${alvo}`}
                          className="text-xs font-semibold text-eid-primary-300 hover:underline"
                        >
                          Ver usuário →
                        </a>
                      )}
                      {usuarioVer && !alvo && (
                        <a
                          href={`/admin/usuarios/${usuarioVer}`}
                          className="text-xs font-semibold text-eid-primary-300 hover:underline"
                        >
                          Ver usuário →
                        </a>
                      )}
                    </div>
                  </div>
                  <form action={adminMarcarAlertaLido}>
                    <input type="hidden" name="id" value={a.id} />
                    <button
                      type="submit"
                      className="shrink-0 rounded-xl border border-[color:var(--eid-border-subtle)] px-3 py-1.5 text-[11px] font-bold text-eid-text-secondary transition hover:border-eid-primary-500/40 hover:text-eid-fg"
                    >
                      Marcar lido
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Quick links */}
      <section>
        <h3 className="mb-3 text-sm font-bold text-eid-fg">Acesso rápido</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {[
            { href: "/admin/usuarios", label: "Buscar usuário" },
            { href: "/admin/partidas", label: "Últimas partidas" },
            { href: "/admin/denuncias", label: "Fila de denúncias" },
            { href: "/admin/suporte", label: "Chamados abertos" },
            { href: "/admin/funcionalidades-do-app", label: "Funcionalidades" },
            { href: "/admin/regras", label: "Regras & Pontuação" },
            { href: "/admin/eid", label: "Auditoria EID" },
            { href: "/admin/financeiro", label: "Parâmetros financeiros" },
          ].map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/60 px-3 py-2.5 text-[12px] font-semibold text-eid-text-secondary transition hover:border-eid-primary-500/30 hover:bg-eid-card hover:text-eid-fg"
            >
              {l.label}
            </a>
          ))}
        </div>
      </section>

      {/* Push test — dev tool, at the bottom */}
      <section className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/60 p-5">
        <h3 className="text-sm font-bold text-eid-fg">Teste manual de Push</h3>
        <p className="mt-1 text-xs leading-relaxed text-eid-text-secondary">
          Dispara uma notificação de teste para um usuário específico. Busque pelo nome ou{" "}
          <span className="whitespace-nowrap">@username</span>. O{" "}
          <strong className="text-eid-fg">sininho</strong> reflete o banco (Realtime). O{" "}
          <strong className="text-eid-fg">alerta do sistema</strong> exige subscription Web Push ativa no mesmo host.
        </p>
        {!isPushDispatchConfigured() && (
          <p className="mt-2 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100">
            Par VAPID incompleto neste deploy — Web Push desabilitado. Veja{" "}
            <a className="font-semibold underline" href="/admin/push">
              Admin → Push
            </a>
            .
          </p>
        )}
        {flash === "push_teste_ok" && (
          <div className="mt-3 space-y-2">
            <p className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-100">
              Notificação criada. Resultado do envio Web Push abaixo.
            </p>
            {pushDbg && (
              <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 px-3 py-2 text-[11px] text-eid-text-secondary">
                <p>
                  Servidor: <strong className="text-eid-fg">{pushDbg.sent}</strong> aceito(s) ·{" "}
                  <strong className="text-eid-fg">{pushDbg.failed}</strong> falha(s) · sem aparelho:{" "}
                  <strong className="text-eid-fg">{pushDbg.noDevice}</strong>
                </p>
                {pushDbg.skip === "vapid_incomplete" && (
                  <p className="mt-2 font-semibold text-amber-200">VAPID incompleto — nenhum envio ao FCM.</p>
                )}
                {pushDbg.skip === "dispatch_threw" && (
                  <div className="mt-2 space-y-1">
                    <p className="font-semibold text-rose-200">
                      Erro ao despachar push. Verifique os logs do servidor.
                    </p>
                    {pushDbg.errDetail && (
                      <p className="rounded border border-rose-500/30 bg-rose-500/10 px-2 py-1.5 font-mono text-[10px] text-rose-100">
                        {pushDbg.errDetail}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {(flash === "push_teste_param_invalido" ||
          flash === "push_teste_usuario_nao_encontrado" ||
          flash === "push_teste_insert_erro" ||
          flash === "push_teste_erro") && (
          <p className="mt-3 rounded-xl border border-rose-500/35 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-100">
            Não foi possível disparar o push. Confira o usuário selecionado e a configuração de push.
          </p>
        )}
        <form action={adminDispararPushTesteParaUsuario} className="mt-4 grid gap-3">
          <AdminPushUsuarioPicker initialUserId={pushUserId} />
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <input
              name="mensagem"
              placeholder="Mensagem do push (opcional)"
              className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/55 px-3 py-2 text-xs text-eid-fg"
            />
            <button
              type="submit"
              className="rounded-xl border border-eid-primary-500/40 bg-eid-primary-500/15 px-4 py-2 text-xs font-bold text-eid-primary-200 transition hover:border-eid-primary-500/60"
            >
              Disparar
            </button>
          </div>
        </form>
        {pushDiag && (
          <div className="mt-3 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/35 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-eid-text-secondary">Diagnóstico</p>
            <p className="mt-1 text-xs text-eid-fg">
              Usuário: <span className="font-mono text-eid-text-secondary">{pushDiag.userId}</span>
            </p>
            <p className="mt-1 text-xs text-eid-text-secondary">
              Subscriptions: <strong className="text-eid-fg">{pushDiag.subsAtivas}</strong> ativa(s) de{" "}
              <strong className="text-eid-fg">{pushDiag.subsTotais}</strong> total.
            </p>
            {pushDiag.checklist.length > 0 && (
              <ul className="mt-2 space-y-1">
                {pushDiag.checklist.map((msg, idx) => (
                  <li
                    key={`${idx}-${msg.slice(0, 12)}`}
                    className="rounded-lg border border-amber-500/25 bg-amber-500/8 px-2 py-1 text-[11px] text-amber-100"
                  >
                    {msg}
                  </li>
                ))}
              </ul>
            )}
            {pushDiag.ultimasEntregas.length > 0 && (
              <div className="mt-2 rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-card/60 p-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-eid-text-secondary">
                  Últimas entregas
                </p>
                <ul className="mt-1 space-y-0.5">
                  {pushDiag.ultimasEntregas.map((e, idx) => (
                    <li key={`last-${e.notifId ?? "n"}-${idx}`} className="text-[11px] text-eid-text-secondary">
                      #{e.notifId ?? "?"} · {e.status ?? "?"}{" "}
                      {e.enviadoEm ? `· ${new Date(e.enviadoEm).toLocaleString("pt-BR")}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {pushDiag.ultimosErros.length > 0 && (
              <ul className="mt-2 space-y-1.5">
                {pushDiag.ultimosErros.map((e, idx) => (
                  <li
                    key={`${e.notifId ?? "n"}-${idx}`}
                    className="rounded-lg border border-rose-500/25 bg-rose-500/8 px-2.5 py-1.5"
                  >
                    <p className="text-[11px] text-eid-fg">
                      {e.status ?? "erro"} · notif #{e.notifId ?? "?"}
                    </p>
                    {e.erro && <p className="text-[10px] text-rose-200">{e.erro}</p>}
                    {e.enviadoEm && (
                      <p className="text-[10px] text-eid-text-secondary">
                        {new Date(e.enviadoEm).toLocaleString("pt-BR")}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
