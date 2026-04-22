import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PerfilTimeEditForm } from "@/components/perfil/perfil-time-edit-form";
import { ProfileEditFullscreenShell } from "@/components/perfil/profile-edit-fullscreen-shell";
import { contaNextPath, requireContaPerfilPronto } from "@/lib/conta/require-perfil-pronto";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ id: string }>; searchParams?: Promise<{ from?: string }> };

export default async function EditarTimeFullscreenPage({ params, searchParams }: Props) {
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isFinite(id) || id < 1) notFound();

  const sp = (await searchParams) ?? {};
  const from = typeof sp.from === "string" && sp.from.startsWith("/") ? sp.from : `/editar/equipes`;

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

  return (
    <ProfileEditFullscreenShell
      backHref={from}
      title="Editar equipe"
      subtitle="Altere nome público, @username, bio, escudo e preferências da equipe."
      topAction={
        <Link href={`/times?from=${encodeURIComponent(`/editar/time/${id}`)}`} className="text-[10px] font-semibold text-eid-primary-300 underline">
          Gerenciar elenco
        </Link>
      }
    >
      <PerfilTimeEditForm
        variant="page"
        timeId={id}
        nome={t.nome ?? ""}
        username={t.username ?? null}
        bio={t.bio ?? null}
        localizacao={t.localizacao ?? null}
        escudo={t.escudo ?? null}
        interesse_rank_match={Boolean(t.interesse_rank_match)}
        disponivel_amistoso={Boolean(t.disponivel_amistoso)}
        vagas_abertas={Boolean(t.vagas_abertas)}
        aceita_pedidos={Boolean(t.aceita_pedidos)}
        interesse_torneio={Boolean(t.interesse_torneio)}
        nivel_procurado={t.nivel_procurado ?? null}
      />
    </ProfileEditFullscreenShell>
  );
}

