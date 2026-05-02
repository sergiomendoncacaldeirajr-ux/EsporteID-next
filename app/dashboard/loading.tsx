import { DashboardPageSkeleton } from "@/components/loading/dashboard-page-skeleton";
import { eidRouteSkeletonsDisabled } from "@/lib/eid-route-skeleton-flag";

export default function LoadingDashboard() {
  if (eidRouteSkeletonsDisabled()) return null;
  return <DashboardPageSkeleton />;
}
