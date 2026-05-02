/**
 * Diagnóstico: defina EID_DISABLE_ROUTE_SKELETONS=1 (ou NEXT_PUBLIC_…) para que os
 * route segment loading.tsx retornem null — sem shimmer nem placeholder.
 * Serve para separar lentidão do RSC da sensação causada pelo skeleton.
 */
export function eidRouteSkeletonsDisabled(): boolean {
  return (
    process.env.EID_DISABLE_ROUTE_SKELETONS === "1" ||
    process.env.NEXT_PUBLIC_EID_DISABLE_ROUTE_SKELETONS === "1"
  );
}
