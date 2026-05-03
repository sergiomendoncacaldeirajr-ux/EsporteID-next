import { notFound, redirect } from "next/navigation";
import { EidStreamSection } from "@/components/eid-stream-section";
import { EditarTimeDuplaSkeleton } from "@/components/loading/profile-app-skeletons";
import { createClient } from "@/lib/supabase/server";
import { EditarTimeStream } from "./time-edit-stream";

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ from?: string; embed?: string; convidar?: string }>;
};

export default async function EditarTimeFullscreenPage({ params, searchParams }: Props) {
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isFinite(id) || id < 1) notFound();

  const sp = (await searchParams) ?? {};

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/editar/time/${id}`)}`);

  return (
    <EidStreamSection fallback={<EditarTimeDuplaSkeleton />}>
      <EditarTimeStream timeId={id} viewerId={user.id} sp={sp} />
    </EidStreamSection>
  );
}
