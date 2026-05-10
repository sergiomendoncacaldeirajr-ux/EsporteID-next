import { SkBlock, SkMain } from "@/components/loading/skeleton-primitives";
import { eidRouteSkeletonsDisabled } from "@/lib/eid-route-skeleton-flag";

export default function LoadingLocalPublico() {
  if (eidRouteSkeletonsDisabled()) return null;
  return (
    <SkMain variant="wide5">
      {/* Hero card */}
      <div className="overflow-hidden rounded-2xl">
        {/* Cover */}
        <SkBlock className="h-44 w-full rounded-none sm:h-56" />
        <div className="p-4 pt-0">
          {/* Logo + map button row */}
          <div className="-mt-8 mb-3 flex items-end justify-between">
            <SkBlock className="h-16 w-16 rounded-[14px]" />
            <SkBlock className="h-8 w-28 rounded-xl" />
          </div>
          {/* Name */}
          <SkBlock className="h-7 w-3/5 rounded-lg" />
          <SkBlock className="mt-2 h-3.5 w-2/5 rounded-md" />
        </div>
      </div>

      {/* Stats grid */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkBlock key={i} className="h-20 rounded-xl" />
        ))}
      </div>

      {/* Services */}
      <SkBlock className="mt-5 h-3 w-24 rounded-md" />
      <div className="mt-3 grid gap-2">
        <SkBlock className="h-16 rounded-2xl" />
        <SkBlock className="h-16 rounded-2xl" />
      </div>

      {/* Amenities */}
      <SkBlock className="mt-5 h-3 w-24 rounded-md" />
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkBlock key={i} className="h-6 w-16 rounded-full" />
        ))}
      </div>
    </SkMain>
  );
}
