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
      const [
        p,
        t,
        tm,
        e,
        pa,
        m,
        nNotif,
        d,
        dAbertas,
        eid,
        al,
      ] = await Promise.all([
        db.from("profiles").select("id", { count: "exact", head: true }),
        db.from("torneios").select("id", { count: "exact", head: true }),
        db.from("times").select("id", { count: "exact", head: true }),
        db.from("espacos_genericos").select("id", { count: "exact", head: true }),
        db.from("partidas").select("id", { count: "exact", head: true }),
        db.from("matches").select("id", { count: "exact", head: true }),
        db.from("notificacoes").select("id", { count: "exact", head: true }),
        db.from("denuncias").select("id", { count: "exact", head: true }),
        db
          .from("denuncias")
          .select("id", { count: "exact", head: true })
          .in("status", ["aberta", "em_analise"]),
        db.from("usuario_eid").select("id", { count: "exact", head: true }),
        db
          .from("admin_alertas")
          .select("id, tipo, titulo, corpo, payload_json, lido, criado_em")
          .eq("lido", false)
          .order("criado_em", { ascending: false })
          .limit(20),
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
        const subIdList = [...subIds];
        const { data: entregaRows } =
          subIdList.length > 0
            ? await db
                .from("push_entregas_notificacao")
                .select("notificacao_id, status, ultimo_erro, enviado_em, subscription_id")
                .in("subscription_id", subIdList)
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
        if (!isPushDispatchConfigured()) {
          checklist.push(
            "Chaves VAPID incompletas neste servidor (NEXT_PUBLIC_VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY) — o envio Web Push não roda; o sininho ainda pode atualizar pelo banco."
          );
        }
        if (subs.length === 0) checklist.push("Sem subscription cadastrada para este usuário (precisa ativar push no aparelho).");
        if (subs.length > 0 && subs.filter((s) => s.ativo !== false).length === 0) {
          checklist.push("Subscriptions existem, mas nenhuma está ativa (reativar push no app).");
        }
        if (has410or404) checklist.push("Há erro 410/404 em envio anterior (subscription expirada/removida).");
        if (!hasSuccess && ultimasEntregas.length > 0) checklist.push("Sem sucesso recente de entrega para este usuário.");
        if (hasSuccess) checklist.push("Há entrega com sucesso recente: canal push está operacional para ao menos um device.");
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
      /* service key inválida etc. */
    }
  }

  const pills = [
    { k: "profiles", label: "Perfis", href: "/admin/usuarios" },
    { k: "torneios", label: "Torneios", href: "/admin/torneios" },
    { k: "times", label: "Times", href: "/admin/equipes" },
    { k: "espacos", label: "Locais", href: "/admin/locais" },
    { k: "partidas", label: "Partidas", href: "/admin/partidas" },
    { k: "matches", label: "Pedidos", href: "/admin/matches" },
    { k: "social_ops", label: "Notif.", href: "/admin/operacoes-sociais" },
    { k: "denuncias", label: "Denúncias", href: "/admin/denuncias" },
    { k: "eids", label: "EID", href: "/admin/eid" },
  ] as const;

  return (
    <div>
      <h2 className="text-base font-bold text-eid-fg">Visão geral</h2>
      <p className="mt-1 text-sm text-eid-text-secondary">
        Gerencie usuários, esportes, locais, torneios, partidas, pedidos de desafio, notificações e fluxos sociais, denúncias, parâmetros financeiros e o motor EID.
      </p>

      {counts.denuncias_abertas != null && counts.denuncias_abertas > 0 ? (
        <a
          href="/admin/denuncias"
          className="mt-4 flex items-center justify-between rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 transition hover:border-amber-400/50"
        >
          <span>
            <span className="font-bold">{counts.denuncias_abertas}</span> denúncia(s) aguardando análise
          </span>
          <span className="text-xs font-bold uppercase tracking-wide text-amber-200">Abrir →</span>
        </a>
      ) : null}

      {alertas.length > 0 ? (
        <div className="mt-6">
          <h3 className="text-sm font-bold text-eid-fg">Alertas recentes (não lidos)</h3>
          <p className="mt-0.5 text-xs text-eid-text-secondary">Denúncias, verificações de idade e outros eventos.</p>
          <ul className="mt-3 space-y-2">
            {alertas.map((a) => {
              const payload = a.payload_json ?? {};
              const alvo = typeof payload.alvo_usuario_id === "string" ? payload.alvo_usuario_id : null;
              const usuarioVer = typeof payload.usuario_id === "string" ? payload.usuario_id : null;
              return (
                <li
                  key={a.id}
                  className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/80 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-mono uppercase tracking-wide text-eid-text-secondary">{a.tipo}</p>
                    <p className="text-sm font-semibold text-eid-fg">{a.titulo}</p>
                    {a.corpo ? <p className="mt-1 text-xs text-eid-text-secondary">{a.corpo}</p> : null}
                    <p className="mt-1 text-[10px] text-eid-text-secondary">
                      {new Date(a.criado_em).toLocaleString("pt-BR")}
                    </p>
                    {alvo ? (
                      <a href={`/perfil/${alvo}`} className="mt-1 inline-block text-xs font-semibold text-eid-primary-300">
                        Ver perfil alvo
                      </a>
                    ) : null}
                    {usuarioVer && !alvo ? (
                      <a href={`/perfil/${usuarioVer}`} className="mt-1 inline-block text-xs font-semibold text-eid-primary-300">
                        Ver perfil
                      </a>
                    ) : null}
                  </div>
                  <form action={adminMarcarAlertaLido}>
                    <input type="hidden" name="id" value={a.id} />
                    <button
                      type="submit"
                      className="rounded-lg border border-[color:var(--eid-border-subtle)] px-2 py-1 text-[10px] font-bold text-eid-text-secondary hover:border-eid-primary-500/40"
                    >
                      Marcar lido
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <section id="admin-push-teste" className="mt-6 scroll-mt-24 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-4">
        <h3 className="text-sm font-bold text-eid-fg">Teste manual de Push</h3>
        <p className="mt-1 text-xs text-eid-text-secondary">
          Dispara uma notificação de teste para um usuário específico (via service role), para validar entrega no aparelho. Busque pelo nome ou{" "}
          <span className="whitespace-nowrap">@username</span> — não precisa colar o UUID inteiro.
        </p>
        <p className="mt-2 text-[11px] leading-relaxed text-eid-text-secondary">
          O <span className="font-semibold text-eid-fg">sininho</span> reflete a linha no banco (Realtime). O{" "}
          <span className="font-semibold text-eid-fg">alerta do Windows/Android</span> só aparece se existir subscription Web Push para o mesmo usuário e o mesmo{" "}
          <span className="font-semibold text-eid-fg">host</span> (não misture <code className="rounded bg-eid-bg/80 px-1 font-mono text-[10px]">localhost</code> com{" "}
          <code className="rounded bg-eid-bg/80 px-1 font-mono text-[10px]">127.0.0.1</code>).
        </p>
        {!isPushDispatchConfigured() ? (
          <p className="mt-2 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100">
            Neste deploy o par VAPID está incompleto — nenhum Web Push será enviado. Veja{" "}
            <a className="font-semibold underline" href="/admin/push">
              Admin → Push
            </a>
            .
          </p>
        ) : null}
        {flash === "push_teste_ok" ? (
          <div className="mt-3 space-y-2">
            <p className="rounded-lg border border-emerald-500/35 bg-emerald-500/12 px-3 py-2 text-xs font-semibold text-[color:color-mix(in_srgb,var(--eid-success-600)_80%,var(--eid-fg)_20%)]">
              Notificação criada (sininho). Abaixo: resultado do envio Web Push neste disparo.
            </p>
            {pushDbg ? (
              <div className="rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 px-3 py-2 text-[11px] text-eid-text-secondary">
                <p>
                  Servidor: <span className="font-semibold text-eid-fg">{pushDbg.sent}</span> envio(s) aceito(s) pelo push service ·{" "}
                  <span className="font-semibold text-eid-fg">{pushDbg.failed}</span> falha(s) · notif. sem aparelho inscrito:{" "}
                  <span className="font-semibold text-eid-fg">{pushDbg.noDevice}</span>
                  {pushDbg.attempted ? "" : " · despacho não concluído"}
                </p>
                {pushDbg.skip === "vapid_incomplete" ? (
                  <p className="mt-2 font-semibold text-amber-200">VAPID incompleto neste servidor — nenhum envio ao FCM foi feito.</p>
                ) : null}
                {pushDbg.skip === "dispatch_threw" ? (
                  <div className="mt-2 space-y-1">
                    <p className="font-semibold text-rose-200">
                      Erro ao despachar push no servidor. Em desenvolvimento: terminal onde roda <code className="rounded bg-eid-bg/80 px-1 font-mono text-[10px]">npm run dev</code>
                      . Em produção: painel do host (ex. Vercel → projeto → Logs). Procure por{" "}
                      <code className="rounded bg-eid-bg/80 px-1 font-mono text-[10px]">[push-imediato]</code>.
                    </p>
                    {pushDbg.errDetail ? (
                      <p className="rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-1.5 font-mono text-[10px] text-rose-100">{pushDbg.errDetail}</p>
                    ) : null}
                  </div>
                ) : null}
                {pushDbg.skip === "ok" && pushDbg.attempted && pushDbg.noDevice >= 1 && pushDbg.sent === 0 && pushDbg.failed === 0 ? (
                  <p className="mt-2 font-semibold text-amber-100">
                    Este usuário não tem subscription ativa no banco para receber Web Push neste ambiente. No aparelho dele: abrir o site pelo mesmo endereço que você usa no admin, entrar na conta dele e ativar notificações no sininho (permissão do navegador).
                  </p>
                ) : null}
                {pushDbg.skip === "ok" && pushDbg.attempted && pushDbg.failed >= 1 ? (
                  <p className="mt-2 font-semibold text-amber-100">
                    O push service recusou ou falhou — confira em Diagnóstico rápido o campo último_erro (ex.: subscription expirada, chave VAPID trocada sem nova inscrição).
                  </p>
                ) : null}
                {pushDbg.skip === "ok" && pushDbg.sent >= 1 ? (
                  <p className="mt-2 text-eid-fg">
                    O servidor recebeu confirmação do envio. Se o sistema não mostrou o banner: janela em primeiro plano, modo Não perturbar, ou bloqueio de notificações do site no Chrome/Edge (ícone de cadeado → notificações).
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
        {flash === "push_teste_param_invalido" ||
        flash === "push_teste_usuario_nao_encontrado" ||
        flash === "push_teste_insert_erro" ||
        flash === "push_teste_erro" ? (
          <p className="mt-3 rounded-lg border border-rose-500/35 bg-rose-500/12 px-3 py-2 text-xs font-semibold text-[color:color-mix(in_srgb,var(--eid-danger-600)_82%,var(--eid-fg)_18%)]">
            Não foi possível disparar o push de teste. Confira se escolheu um usuário válido na busca (ou o ID da URL) e a configuração de push.
          </p>
        ) : null}
        <form action={adminDispararPushTesteParaUsuario} className="mt-3 grid gap-3">
          <AdminPushUsuarioPicker initialUserId={pushUserId} />
          <div className="grid gap-2 sm:grid-cols-[2fr_auto] sm:items-end">
            <input
              name="mensagem"
              placeholder="Mensagem do push (opcional)"
              className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/55 px-3 py-2 text-xs text-eid-fg"
            />
            <button
              type="submit"
              className="rounded-xl border border-eid-primary-500/40 bg-eid-primary-500/12 px-3 py-2 text-xs font-bold uppercase tracking-wide text-eid-primary-300 hover:border-eid-primary-500/60"
            >
              Disparar push
            </button>
          </div>
        </form>
        {pushDiag ? (
          <div className="mt-3 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/35 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-eid-text-secondary">Diagnóstico rápido</p>
            <p className="mt-1 text-xs text-eid-fg">
              Usuário: <span className="font-mono">{pushDiag.userId}</span>
            </p>
            <p className="mt-1 text-xs text-eid-text-secondary">
              Subscriptions: <span className="font-semibold text-eid-fg">{pushDiag.subsAtivas}</span> ativa(s) de{" "}
              <span className="font-semibold text-eid-fg">{pushDiag.subsTotais}</span> total.
            </p>
            {pushDiag.checklist.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {pushDiag.checklist.map((msg, idx) => (
                  <li key={`${idx}-${msg.slice(0, 12)}`} className="rounded-md border border-amber-500/25 bg-amber-500/8 px-2 py-1 text-[11px] text-amber-100">
                    {msg}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-eid-text-secondary">Sem sinais de falha no resumo automático.</p>
            )}
            {pushDiag.ultimasEntregas.length > 0 ? (
              <div className="mt-2 rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-card/60 p-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-eid-text-secondary">Últimas entregas</p>
                <ul className="mt-1 space-y-1">
                  {pushDiag.ultimasEntregas.map((e, idx) => (
                    <li key={`last-${e.notifId ?? "n"}-${idx}`} className="text-[11px] text-eid-text-secondary">
                      #{e.notifId ?? "?"} · {e.status ?? "?"}
                      {e.enviadoEm ? ` · ${new Date(e.enviadoEm).toLocaleString("pt-BR")}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {pushDiag.ultimosErros.length > 0 ? (
              <ul className="mt-2 space-y-1.5">
                {pushDiag.ultimosErros.map((e, idx) => (
                  <li key={`${e.notifId ?? "n"}-${idx}`} className="rounded-lg border border-rose-500/25 bg-rose-500/8 px-2.5 py-1.5">
                    <p className="text-[11px] text-eid-fg">
                      {e.status ?? "erro"} · notif #{e.notifId ?? "?"}
                    </p>
                    {e.erro ? <p className="text-[10px] text-rose-200">{e.erro}</p> : null}
                    {e.enviadoEm ? <p className="text-[10px] text-eid-text-secondary">{new Date(e.enviadoEm).toLocaleString("pt-BR")}</p> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-eid-text-secondary">Sem falhas recentes para as subscriptions desse usuário.</p>
            )}
          </div>
        ) : null}
      </section>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {pills.map(({ k, label, href }) => (
          <a
            key={k}
            href={href}
            className="group rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 px-3 py-4 text-center shadow-sm transition hover:border-eid-primary-500/40 hover:bg-eid-card hover:shadow-[0_12px_40px_-16px_rgba(37,99,235,0.35)]"
          >
            <span className="block text-2xl font-black tabular-nums text-eid-action-500 transition group-hover:text-eid-action-400">
              {counts[k] ?? "—"}
            </span>
            <span className="mt-1 block text-[10px] font-bold uppercase tracking-wide text-eid-text-secondary group-hover:text-eid-text-muted">
              {label}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
