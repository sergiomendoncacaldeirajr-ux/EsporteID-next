import { redirect } from "next/navigation";
import { EidStreamSection } from "@/components/eid-stream-section";
import { OnboardingStreamSkeleton } from "@/components/loading/profile-app-skeletons";
import { createClient } from "@/lib/supabase/server";
import { OnboardingStream } from "./onboarding-stream";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/onboarding")}`);
  }

  return (
    <EidStreamSection fallback={<OnboardingStreamSkeleton />}>
      <OnboardingStream viewerId={user.id} />
    </EidStreamSection>
  );
}
