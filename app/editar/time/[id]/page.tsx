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
      "id, nome, username, bio, localizacao, escudo, criador_id, interesse_rank_match, disponivel_amistoso, vagas_abertas, aceita_pedidos, interesse_torneio, nivel_procurado"
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

  const [{ data: membrosRows }, { data: convitesRows }] = await Promise.all([
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
  ]);

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
        <Link href={`/perfil-time/${id}?from=${encodeURIComponent(`/editar/time/${id}`)}`} className="text-[10px] font-semibold text-eid-primary-300 underline">
          Ver perfil público
        </Link>
      }
    >
      <section className="eid-surface-panel mb-3 rounded-2xl p-3 sm:p-4">
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
      </section>
      <PerfilTimeEditForm
        variant="page"
        timeId={id}
        nome={t.nome ?? ""}
        username={t.username ?? null}
        bio={t.bio ?? null}
        localizacao={t.localizacao ?? null}
        escudo={t.escudo ?? null}
        interesse_rank_match={Boolean(t.interesse_rank_match)}
        vagas_abertas={Boolean(t.vagas_abertas)}
        aceita_pedidos={Boolean(t.aceita_pedidos)}
        interesse_torneio={Boolean(t.interesse_torneio)}
        nivel_procurado={t.nivel_procurado ?? null}
      />
      <div className="mt-3">
        <TeamRosterManager
          timeId={id}
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

