import { SkBlock } from "@/components/loading/skeleton-primitives";
import { PROFILE_HERO_PANEL_CLASS, PROFILE_PUBLIC_MAIN_CLASS } from "@/components/perfil/profile-ui-tokens";

/** Topo do hero (escudo, título, chips) — sem stats nem cartão do líder. */
export function PerfilFormacaoHeroIdentitySkeleton() {
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-5">
      <SkBlock className="h-24 w-24 shrink-0 rounded-2xl sm:h-28 sm:w-28" />
      <div className="flex w-full min-w-0 flex-1 flex-col items-center gap-2 sm:items-start">
        <SkBlock className="h-6 w-44 rounded-full" />
        <SkBlock className="h-8 w-56 max-w-full rounded-lg" />
        <SkBlock className="h-4 w-full max-w-xs rounded" />
      </div>
    </div>
  );
}

/** Faixa de vitórias / derrotas / win rate / jogos. */
export function PerfilFormacaoHeroStatsRowSkeleton() {
  return (
    <div className="mt-4 grid grid-cols-4 gap-1.5">
      {Array.from({ length: 4 }).map((_, i) => (
        <SkBlock key={i} className="h-14 rounded-xl" />
      ))}
    </div>
  );
}

/** Cartão do líder (hero). */
export function PerfilFormacaoHeroLeaderRowSkeleton() {
  return <SkBlock className="mx-auto mt-4 h-14 w-full max-w-md rounded-xl" />;
}

/** Placeholder do painel superior (escudo, título, faixa de stats). */
export function PerfilFormacaoHeroStreamSkeleton() {
  return (
    <div className={`${PROFILE_HERO_PANEL_CLASS} relative mt-2 p-3 sm:p-4`}>
      <PerfilFormacaoHeroIdentitySkeleton />
      <PerfilFormacaoHeroStatsRowSkeleton />
      <PerfilFormacaoHeroLeaderRowSkeleton />
    </div>
  );
}

/** Convites / candidatura (faixa superior do corpo). */
export function PerfilFormacaoBodyCandidaturaSkeleton() {
  return <SkBlock className="h-28 w-full rounded-xl" />;
}

/** Bloco “Ação principal” (visitante). */
export function PerfilFormacaoBodyVisitanteSkeleton() {
  return <SkBlock className="h-44 w-full rounded-xl" />;
}

/** EID + métricas + timeline. */
export function PerfilFormacaoBodyEidSkeleton() {
  return <SkBlock className="h-48 w-full rounded-xl" />;
}

/** Histórico de confrontos. */
export function PerfilFormacaoBodyConfrontosSkeleton() {
  return <SkBlock className="h-40 w-full rounded-xl" />;
}

/** Participantes + gestão. */
export function PerfilFormacaoBodyElencoSkeleton() {
  return <SkBlock className="h-52 w-full rounded-xl" />;
}

/** Gestão da formação (líder). */
export function PerfilFormacaoBodyGestaoSkeleton() {
  return <SkBlock className="h-32 w-full rounded-xl" />;
}

/** Prateleira de conquistas. */
export function PerfilFormacaoBodyConquistasSkeleton() {
  return <SkBlock className="h-24 w-full rounded-xl" />;
}

/** Candidatura + ação principal (visitante). */
export function PerfilFormacaoBodyVisitanteStackSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <PerfilFormacaoBodyCandidaturaSkeleton />
      <PerfilFormacaoBodyVisitanteSkeleton />
    </div>
  );
}

/** Placeholder das seções abaixo do hero. */
export function PerfilFormacaoBodyStreamSkeleton() {
  return (
    <div className="mt-6 grid gap-6" aria-hidden>
      <PerfilFormacaoBodyCandidaturaSkeleton />
      <PerfilFormacaoBodyVisitanteSkeleton />
      <PerfilFormacaoBodyEidSkeleton />
      <PerfilFormacaoBodyConfrontosSkeleton />
      <PerfilFormacaoBodyElencoSkeleton />
    </div>
  );
}

/** Fallback completo (rota `loading.tsx`): hero + corpo. */
export function PerfilFormacaoStreamSkeleton() {
  return (
    <main data-eid-formacao-page className={PROFILE_PUBLIC_MAIN_CLASS}>
      <PerfilFormacaoHeroStreamSkeleton />
      <PerfilFormacaoBodyStreamSkeleton />
    </main>
  );
}
