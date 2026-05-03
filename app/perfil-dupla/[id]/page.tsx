import { notFound, redirect } from "next/navigation";
import { EidStreamSection } from "@/components/eid-stream-section";
import { PerfilFormacaoStreamSkeleton } from "@/components/loading/perfil-formacao-stream-skeleton";
import { loginNextWithOptionalFrom } from "@/lib/auth/login-next-path";
import { createClient } from "@/lib/supabase/server";
import { PerfilDuplaStream } from "./perfil-dupla-stream";

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ from?: string }>;
};

export default async function PerfilDuplaPage({ params, searchParams }: Props) {
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isFinite(id) || id < 1) notFound();

  const sp = (await searchParams) ?? {};

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(loginNextWithOptionalFrom(`/perfil-dupla/${id}`, sp));

  return (
    <EidStreamSection fallback={<PerfilFormacaoStreamSkeleton />}>
      <PerfilDuplaStream duplaId={id} viewerId={user.id} />
    </EidStreamSection>
  );
}
