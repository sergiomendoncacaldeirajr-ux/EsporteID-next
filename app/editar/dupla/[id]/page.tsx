import { notFound, redirect } from "next/navigation";
import { PerfilDuplaEditForm } from "@/components/perfil/perfil-dupla-edit-form";
import { ProfileEditFullscreenShell } from "@/components/perfil/profile-edit-fullscreen-shell";
import { resolverTimeIdParaDuplaRegistrada } from "@/lib/perfil/whatsapp-visibility";
import { contaNextPath, requireContaPerfilPronto } from "@/lib/conta/require-perfil-pronto";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ id: string }>; searchParams?: Promise<{ from?: string; embed?: string }> };

export default async function EditarDuplaFullscreenPage({ params, searchParams }: Props) {
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isFinite(id) || id < 1) notFound();

  const sp = (await searchParams) ?? {};
  const from = typeof sp.from === "string" && sp.from.startsWith("/") ? sp.from : `/editar/equipes`;
  const isEmbed = sp.embed === "1";

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
      showBack={!isEmbed}
    >
      <section className="eid-surface-panel overflow-hidden rounded-2xl p-0">
        <div className="flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Dados da dupla</p>
          <span className="rounded-full border border-eid-action-500/35 bg-eid-action-500/10 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.06em] text-eid-action-400">
            Edição
          </span>
        </div>
        <div className="p-3">
          <PerfilDuplaEditForm
            variant="page"
            duplaId={id}
            username={d.username ?? null}
            bio={d.bio ?? null}
            timeFormacaoRadarId={timeFormacaoRadarId}
          />
        </div>
      </section>
    </ProfileEditFullscreenShell>
  );
}

