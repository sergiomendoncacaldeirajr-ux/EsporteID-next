import { notFound, redirect } from "next/navigation";
import { EidStreamSection } from "@/components/eid-stream-section";
import {
  PerfilFormacaoBodyStreamSkeleton,
  PerfilFormacaoHeroStreamSkeleton,
} from "@/components/loading/perfil-formacao-stream-skeleton";
import { PROFILE_PUBLIC_MAIN_CLASS } from "@/components/perfil/profile-ui-tokens";
import { loginNextWithOptionalFrom } from "@/lib/auth/login-next-path";
import { createClient } from "@/lib/supabase/server";
import { PerfilDuplaBodyBlock } from "./perfil-dupla-body-block";
import { PerfilDuplaHeroBlock } from "./perfil-dupla-hero-block";

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
    <main data-eid-formacao-page className={PROFILE_PUBLIC_MAIN_CLASS}>
      <EidStreamSection fallback={<PerfilFormacaoHeroStreamSkeleton />}>
        <PerfilDuplaHeroBlock duplaId={id} viewerId={user.id} />
      </EidStreamSection>
      <EidStreamSection fallback={<PerfilFormacaoBodyStreamSkeleton />}>
        <PerfilDuplaBodyBlock duplaId={id} viewerId={user.id} />
      </EidStreamSection>
    </main>
  );
}
