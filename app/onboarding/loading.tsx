import { OnboardingStreamSkeleton } from "@/components/loading/profile-app-skeletons";
import { eidRouteSkeletonsDisabled } from "@/lib/eid-route-skeleton-flag";

export default function OnboardingLoading() {
  if (eidRouteSkeletonsDisabled()) return null;
  return <OnboardingStreamSkeleton />;
}
