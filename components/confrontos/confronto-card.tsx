import Image from "next/image";
import { CalendarClock, ChevronRight, MapPin, Trophy } from "lucide-react";
import { ProfileEditDrawerTrigger } from "@/components/perfil/profile-edit-drawer-trigger";
import { sideInitial, type PublicConfronto, type ConfrontoSide } from "@/lib/confrontos/public-feed";

function EidMini({ value }: { value: number | null }) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return (
    <span className="-mt-1 inline-flex rounded-full border border-eid-primary-500/35 bg-eid-primary-500/15 px-1.5 py-0.5 text-[8px] font-black tabular-nums text-eid-primary-300">
      {value.toFixed(1)} EID
    </span>
  );
}

function SideFace({ side, variant }: { side: ConfrontoSide; variant: "individual" | "formacao" }) {
  const rounded = variant === "formacao" ? "rounded-2xl" : "rounded-full";
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center">
      <ProfileEditDrawerTrigger
        href={side.eidHref}
        fullscreen
        topMode="backOnly"
        openingDelayMs={0}
        title={`Estatísticas EID de ${side.name}`}
        className={`pointer-events-auto group relative block h-14 w-14 shrink-0 outline-none ring-offset-2 ring-offset-eid-bg transition hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-eid-primary-500 active:scale-[0.98]`}
        aria-label={`Estatísticas EID de ${side.name}`}
      >
        <span
          className={`relative block h-14 w-14 overflow-hidden ${rounded} border ${
            side.winner ? "border-eid-action-500/70" : "border-[color:var(--eid-border-subtle)]"
          } bg-eid-surface shadow-[0_8px_22px_-16px_rgba(15,23,42,0.5)] transition group-hover:border-eid-primary-500/50`}
        >
          {side.avatarUrl ? (
            <Image src={side.avatarUrl} alt="" fill unoptimized className="object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-sm font-black text-eid-primary-300">
              {sideInitial(side)}
            </span>
          )}
        </span>
        {side.winner ? (
          <span className="absolute -right-1 -top-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-eid-action-500/50 bg-eid-action-500 text-white shadow-[0_8px_16px_-10px_rgba(249,115,22,0.75)]">
            <Trophy className="h-3 w-3" aria-hidden />
          </span>
        ) : null}
      </ProfileEditDrawerTrigger>
      <EidMini value={side.eid} />
      <p className="mt-1 line-clamp-2 max-w-[7rem] text-center text-[11px] font-black leading-tight text-eid-fg">
        {side.name}
      </p>
    </div>
  );
}

export function ConfrontoCard({ item }: { item: PublicConfronto }) {
  const formacao = item.tipo === "dupla" || item.tipo === "time";
  const detailHref = `/confrontos/${item.id}`;
  const dist = item.distanciaKm == null ? null : item.distanciaKm < 1 ? `${Math.round(item.distanciaKm * 1000)} m` : `${item.distanciaKm.toFixed(1)} km`;

  return (
    <article className="relative overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(160deg,color-mix(in_srgb,var(--eid-card)_94%,var(--eid-primary-500)_6%),color-mix(in_srgb,var(--eid-surface)_92%,transparent))] shadow-[0_14px_36px_-30px_rgba(15,23,42,0.75)]">
      <ProfileEditDrawerTrigger
        href={detailHref}
        fullscreen
        topMode="backOnly"
        openingDelayMs={0}
        title={`Detalhes do confronto entre ${item.ladoA.name} e ${item.ladoB.name}`}
        className="absolute inset-0 z-0 outline-none ring-offset-2 ring-offset-eid-bg focus-visible:ring-2 focus-visible:ring-eid-primary-500"
        aria-label={`Detalhes do confronto entre ${item.ladoA.name} e ${item.ladoB.name}`}
      >
        <span className="sr-only">Abrir detalhes do confronto</span>
      </ProfileEditDrawerTrigger>
      <div className="pointer-events-none relative z-[1] p-3">
        <div className="pointer-events-none flex items-center justify-between gap-2">
          <span className="inline-flex items-center rounded-full border border-eid-primary-500/30 bg-eid-primary-500/12 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.08em] text-eid-primary-300">
            {item.esporteNome} · {item.tipo}
          </span>
          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-eid-text-secondary">
            Detalhes <ChevronRight className="h-3 w-3" aria-hidden />
          </span>
        </div>

        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_4.25rem_minmax(0,1fr)] items-start gap-2">
          <SideFace side={item.ladoA} variant={formacao ? "formacao" : "individual"} />
          <div className="flex flex-col items-center pt-2">
            <span className="rounded-full border border-eid-action-500/35 bg-eid-action-500/12 px-2 py-1 text-[10px] font-black text-eid-action-300">
              {item.placar ?? "VS"}
            </span>
            <span className="mt-1 text-[8px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">
              {item.origem}
            </span>
          </div>
          <SideFace side={item.ladoB} variant={formacao ? "formacao" : "individual"} />
        </div>

        <div className="mt-3 grid gap-1.5 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2">
          <p className="flex min-w-0 items-center gap-1.5 text-[11px] font-bold text-eid-fg">
            <CalendarClock className="h-3.5 w-3.5 shrink-0 text-eid-primary-300" aria-hidden />
            <span className="truncate">{item.dataHora ?? "Data a confirmar"}</span>
          </p>
          <p className="flex min-w-0 items-center gap-1.5 text-[10px] text-eid-text-secondary">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-eid-primary-300" aria-hidden />
            <span className="truncate">{item.local ?? "Local a confirmar"}</span>
            {dist ? <span className="shrink-0 font-black text-eid-primary-300">· {dist}</span> : null}
          </p>
        </div>
      </div>
    </article>
  );
}
