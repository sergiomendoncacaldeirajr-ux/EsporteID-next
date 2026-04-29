import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PerfilBackLink } from "@/components/perfil/perfil-back-link";
import { PerfilTimeEditForm } from "@/components/perfil/perfil-time-edit-form";
import { ProfileEditFullscreenShell } from "@/components/perfil/profile-edit-fullscreen-shell";
import { TeamRosterManager } from "@/components/times/team-roster-manager";
import { contaNextPath, requireContaPerfilPronto } from "@/lib/conta/require-perfil-pronto";
import { FormacaoCapIcon } from "@/lib/perfil/formacao-glyphs";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ from?: string; embed?: string; convidar?: string }>;
};

export default async function EditarTimeFullscreenPage({ params, searchParams }: Props) {
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isFinite(id) || id < 1) notFound();

  const sp = (await searchParams) ?? {};
  const from = typeof sp.from === "string" && sp.from.startsWith("/") ? sp.from : `/editar/equipes`;
  const isEmbed = sp.embed === "1";
  const convidarParam = typeof sp.convidar === "string" ? sp.convidar.trim() : "";
  const convidarUsuarioId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(convidarParam)
    ? convidarParam
    : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/editar/time/${id}`)}`);

  await requireContaPerfilPronto(supabase, user.id, contaNextPath(`/editar/time/${id}`, sp));

  const { data: t } = await supabase
    .from("times")
    .select(
      "id, nome, username, bio, localizacao, escudo, criador_id, tipo, disponivel_amistoso, vagas_abertas, aceita_pedidos, nivel_procurado"
    )
    .eq("id", id)
    .maybeSingle();
  if (!t) notFound();
  if (t.criador_id !== user.id) {
    redirect(`/perfil-time/${id}?from=${encodeURIComponent(from)}`);
  }

  let prefillConvidarNome: string | null = null;
  if (convidarUsuarioId) {
    const { data: alvo } = await supabase.from("profiles").select("nome").eq("id", convidarUsuarioId).maybeSingle();
    prefillConvidarNome = alvo?.nome ?? null;
  }

  const tipoFormacao = String(t.tipo ?? "time").trim().toLowerCase() === "dupla" ? "dupla" : "time";
  const rosterCap = tipoFormacao === "dupla" ? 2 : 18;

  const [{ data: membrosRows }, { data: convitesRows }, rosterHeadRes] = await Promise.all([
    supabase
      .from("membros_time")
      .select("usuario_id, cargo, status")
      .eq("time_id", id)
      .in("status", ["ativo", "aceito", "aprovado"]),
    supabase
      .from("time_convites")
      .select("id, convidado_usuario_id, status")
      .eq("time_id", id)
      .eq("status", "pendente")
      .order("id", { ascending: false }),
    supabase.rpc("time_roster_headcount", { p_time_id: id }),
  ]);
  const rosterHeadRaw = rosterHeadRes.data;
  const rosterRpcErr = rosterHeadRes.error;
  const memberIds = (membrosRows ?? []).map((m) => String(m.usuario_id ?? "")).filter(Boolean);
  const rosterCountFallback = new Set([
    ...(t.criador_id ? [String(t.criador_id)] : []),
    ...memberIds,
  ]).size;
  const rosterCount =
    !rosterRpcErr && rosterHeadRaw != null && Number.isFinite(Number(rosterHeadRaw))
      ? Number(rosterHeadRaw)
      : rosterCountFallback;

  const profileIds = [
    ...new Set([
      ...(membrosRows ?? []).map((m) => String(m.usuario_id ?? "")).filter(Boolean),
      ...(convitesRows ?? []).map((c) => String(c.convidado_usuario_id ?? "")).filter(Boolean),
    ]),
  ];
  const profileMap = new Map<string, { nome: string; avatarUrl: string | null; localizacao: string | null }>();
  if (profileIds.length > 0) {
    const { data: profilesRows } = await supabase
      .from("profiles")
      .select("id, nome, avatar_url, localizacao")
      .in("id", profileIds);
    for (const p of profilesRows ?? []) {
      if (!p.id) continue;
      profileMap.set(String(p.id), {
        nome: p.nome ?? "Atleta",
        avatarUrl: p.avatar_url ?? null,
        localizacao: p.localizacao ?? null,
      });
    }
  }

  return (
    <ProfileEditFullscreenShell
      backHref={from}
      title="Editar equipe"
      subtitle="Altere dados da formação e gerencie elenco (pendentes/aprovados)."
      showBack={false}
      hideHeader
    >
      <section className="mb-3">
        {!isEmbed ? <PerfilBackLink href={from} label="Voltar" /> : null}
        <div className="mt-3.5 overflow-hidden rounded-[22px] border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(160deg,color-mix(in_srgb,var(--eid-card)_96%,white_4%),color-mix(in_srgb,var(--eid-surface)_94%,white_6%))] px-3.5 py-3 sm:px-5 sm:py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-2.5">
              <span className="mt-0.5 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white shadow-[0_8px_16px_-12px_rgba(37,99,235,0.42)]">
                <svg viewBox="0 0 24 24" className="h-5.5 w-5.5 text-[#2563EB]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <circle cx="8" cy="9" r="2.6" />
                  <circle cx="15.8" cy="9.6" r="2.2" />
                  <path d="M3.6 18a4.8 4.8 0 0 1 8.8 0" />
                  <path d="M12.8 18a4 4 0 0 1 7.2 0" />
                  <path d="m16.8 16.6 3.6 3.6" />
                  <circle cx="18.6" cy="18.5" r="2.6" />
                </svg>
              </span>
              <div className="min-w-0 pt-1">
                <h1 className="text-[16px] font-black leading-none tracking-tight text-eid-fg sm:text-[26px]">Editar equipe</h1>
                <p className="mt-2 text-[11px] leading-snug text-eid-text-secondary sm:text-[14px]">
                  Altere dados da formação e gerencie elenco (pendentes/aprovados).
                </p>
              </div>
            </div>
            <Link
              href={`/perfil-time/${id}?from=${encodeURIComponent(`/editar/time/${id}`)}`}
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#C9D8F6] bg-white px-2 py-[3px] text-[8px] font-black uppercase tracking-[0.02em] text-[#2563EB] transition hover:bg-[#EEF4FF]"
            >
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <circle cx="12" cy="12" r="3" />
                <path d="M2 12s3.7-6 10-6 10 6 10 6-3.7 6-10 6-10-6-10-6Z" />
              </svg>
              Ver perfil público
            </Link>
          </div>
        </div>
      </section>

      <section className="eid-surface-panel mb-2.5 overflow-hidden rounded-[18px] p-0">
        <div className="flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2">
          <p className="text-[11px] font-black uppercase tracking-[0.04em] text-eid-fg">Resumo da equipe</p>
          <span className="inline-flex items-center gap-1 rounded-full border border-eid-primary-500/30 bg-eid-primary-500/10 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.04em] text-eid-primary-300">
            <FormacaoCapIcon className="h-3 w-3 shrink-0" />
            Formação
          </span>
        </div>
        <div className="p-3">
          <div className="flex items-center gap-2">
            {t.escudo ? (
              <img src={t.escudo} alt={t.nome ?? "Equipe"} className="h-12 w-12 rounded-xl border border-[color:var(--eid-border-subtle)] object-cover" />
            ) : (
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface text-[12px] font-black text-eid-primary-300">
                {(t.nome ?? "EQ").trim().slice(0, 2).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-[13px] font-black text-eid-fg">{t.nome ?? "Formação"}</p>
              <p className="inline-flex max-w-full items-center gap-1 truncate text-[11px] text-eid-text-secondary">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-[#64748B]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M12 21s7-5.8 7-11a7 7 0 1 0-14 0c0 5.2 7 11 7 11Z" />
                  <circle cx="12" cy="10" r="2.4" />
                </svg>
                <span className="truncate">{t.localizacao ?? "Cidade não informada"}</span>
              </p>
            </div>
          </div>
        </div>
      </section>
      <PerfilTimeEditForm
        variant="page"
        timeId={id}
        nome={t.nome ?? ""}
        username={t.username ?? null}
        bio={t.bio ?? null}
        localizacao={t.localizacao ?? null}
        escudo={t.escudo ?? null}
        vagas_abertas={Boolean(t.vagas_abertas)}
        aceita_pedidos={Boolean(t.aceita_pedidos)}
        nivel_procurado={t.nivel_procurado ?? null}
      />
      <div className="mt-2.5">
        <TeamRosterManager
          timeId={id}
          tipoFormacao={tipoFormacao}
          rosterCount={rosterCount}
          rosterCap={rosterCap}
          prefillConvidarUsuarioId={convidarUsuarioId}
          prefillConvidarNome={prefillConvidarNome}
          membros={(membrosRows ?? []).map((m) => {
            const p = profileMap.get(String(m.usuario_id ?? ""));
            return {
              usuarioId: String(m.usuario_id ?? ""),
              nome: p?.nome ?? "Atleta",
              avatarUrl: p?.avatarUrl ?? null,
              localizacao: p?.localizacao ?? null,
              status: String(m.status ?? "ativo"),
              cargo: m.cargo ?? null,
            };
          })}
          convites={(convitesRows ?? []).map((c) => {
            const p = profileMap.get(String(c.convidado_usuario_id ?? ""));
            return {
              conviteId: Number(c.id ?? 0),
              nome: p?.nome ?? "Atleta",
              avatarUrl: p?.avatarUrl ?? null,
              localizacao: p?.localizacao ?? null,
              status: String(c.status ?? "pendente"),
            };
          })}
        />
      </div>
    </ProfileEditFullscreenShell>
  );
}

