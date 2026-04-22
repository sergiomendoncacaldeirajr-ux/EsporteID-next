import { notFound, redirect } from "next/navigation";
import { PerfilDuplaEditForm } from "@/components/perfil/perfil-dupla-edit-form";
import { ProfileEditFullscreenShell } from "@/components/perfil/profile-edit-fullscreen-shell";
import { resolverTimeIdParaDuplaRegistrada } from "@/lib/perfil/whatsapp-visibility";
import { contaNextPath, requireContaPerfilPronto } from "@/lib/conta/require-perfil-pronto";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ id: string }>; searchParams?: Promise<{ from?: string }> };

export default async function EditarDuplaFullscreenPage({ params, searchParams }: Props) {
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isFinite(id) || id < 1) notFound();

  const sp = (await searchParams) ?? {};
  const from = typeof sp.from === "string" && sp.from.startsWith("/") ? sp.from : `/editar/equipes`;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/editar/dupla/${id}`)}`);

  await requireContaPerfilPronto(supabase, user.id, contaNextPath(`/editar/dupla/${id}`, sp));

  const { data: d } = await supabase
    .from("duplas")
    .select("id, username, bio, player1_id, player2_id, criador_id, esporte_id")
    .eq("id", id)
    .maybeSingle();
  if (!d) notFound();

  const donoId = d.criador_id ?? d.player1_id;
  if (donoId !== user.id) {
    redirect(`/perfil-dupla/${id}?from=${encodeURIComponent(from)}`);
  }

  const espId = d.esporte_id != null ? Number(d.esporte_id) : 0;
  const timeFormacaoRadarId =
    d.player1_id && d.player2_id && espId > 0
      ? await resolverTimeIdParaDuplaRegistrada(supabase, d.player1_id, d.player2_id, espId)
      : null;

  return (
    <ProfileEditFullscreenShell
      backHref={from}
      title="Editar dupla"
      subtitle="Atualize dados públicos e vínculo da dupla registrada."
    >
      <PerfilDuplaEditForm
        variant="page"
        duplaId={id}
        username={d.username ?? null}
        bio={d.bio ?? null}
        timeFormacaoRadarId={timeFormacaoRadarId}
      />
    </ProfileEditFullscreenShell>
  );
}

