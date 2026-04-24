"use client";

import dynamic from "next/dynamic";

/** Chunk separado: modal de “instalar app” não bloqueia o JS inicial. */
const InstallAppOfferInner = dynamic(
  () => import("./install-app-offer").then((m) => ({ default: m.InstallAppOffer })),
  { ssr: false, loading: () => null }
);

export function InstallAppOfferDynamic() {
  return <InstallAppOfferInner />;
}
