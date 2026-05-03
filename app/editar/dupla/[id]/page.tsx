import { notFound, redirect } from "next/navigation";
import { EidStreamSection } from "@/components/eid-stream-section";
import { EditarTimeDuplaSkeleton } from "@/components/loading/profile-app-skeletons";
import { createClient } from "@/lib/supabase/server";
import { EditarDuplaStream } from "./dupla-edit-stream";

type Props = { params: Promise<{ id: string }>; searchParams?: Promise<{ from?: string; embed?: string }> };

export default async function EditarDuplaFullscreenPage({ params, searchParams }: Props) {
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isFinite(id) || id < 1) notFound();

  const sp = (await searchParams) ?? {};

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/editar/dupla/${id}`)}`);

  return (
    <EidStreamSection fallback={<EditarTimeDuplaSkeleton />}>
      <EditarDuplaStream duplaId={id} viewerId={user.id} sp={sp} />
    </EidStreamSection>
  );
}
