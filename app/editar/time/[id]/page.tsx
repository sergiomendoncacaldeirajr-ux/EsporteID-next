import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PerfilTimeEditForm } from "@/components/perfil/perfil-time-edit-form";
import { ProfileEditFullscreenShell } from "@/components/perfil/profile-edit-fullscreen-shell";
import { TeamRosterManager } from "@/components/times/team-roster-manager";
import { contaNextPath, requireContaPerfilPronto } from "@/lib/conta/require-perfil-pronto";
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
      .in("status", ["pendente", "aceito", "aprovado"])
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
      showBack={!isEmbed}
      topAction={
        <Link
          href={`/perfil-time/${id}?from=${encodeURIComponent(`/editar/time/${id}`)}`}
          className="inline-flex items-center gap-1 rounded-full border border-eid-primary-500/35 bg-eid-primary-500/12 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-eid-fg transition-all duration-200 hover:-translate-y-[1px] hover:border-eid-primary-500/55 hover:bg-eid-primary-500/18"
        >
          Ver perfil público
        </Link>
      }
    >
      <section className="eid-surface-panel mb-2.5 overflow-hidden rounded-2xl p-0">
        <div className="flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Resumo da equipe</p>
          <span className="rounded-full border border-eid-primary-500/30 bg-eid-primary-500/10 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.06em] text-eid-primary-300">
            Formação
          </span>
        </div>
        <div className="p-3 sm:p-4">
          <div className="flex items-center gap-2">
            {t.escudo ? (
              <img src={t.escudo} alt={t.nome ?? "Equipe"} className="h-12 w-12 rounded-full border border-[color:var(--eid-border-subtle)] object-cover" />
            ) : (
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface text-[12px] font-black text-eid-primary-300">
                {(t.nome ?? "EQ").trim().slice(0, 2).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-eid-fg">{t.nome ?? "Formação"}</p>
              <p className="truncate text-[11px] text-eid-text-secondary">{t.localizacao ?? "Cidade não informada"}</p>
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

