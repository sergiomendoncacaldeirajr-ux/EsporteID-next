import { ProfileAvatarControl } from "@/components/perfil/profile-avatar-control";
import { ProfileEditDrawerTrigger } from "@/components/perfil/profile-edit-drawer-trigger";
import { ProfileCoverControl } from "@/components/perfil/profile-cover-control";
import { ProfileDenunciarButton } from "@/components/perfil/profile-denunciar-button";
import { EidCityState } from "@/components/ui/eid-city-state";
import { PROFILE_HERO_PANEL_CLASS, PROFILE_HERO_ROLE_BADGE_CLASS } from "@/components/perfil/profile-ui-tokens";
import { ProfileFriendlyStatusToggle } from "@/components/perfil/profile-friendly-status-toggle";
import { iniciaisPerfilPublico, type PerfilPublicoProfileRow } from "./perfil-public-shared";

export type PerfilPublicoHeroProps = {
  perfil: PerfilPublicoProfileRow;
  profileId: string;
  isSelf: boolean;
  hasProfessor: boolean;
  hasOrganizador: boolean;
  hasEspaco: boolean;
  vitT: number;
  derT: number;
  winRate: number | null;
  jogosT: number;
  conquistas: string[];
  amistosoPerfilOn: boolean;
  amistosoPerfilExpiresAt: string | null;
};

export function PerfilPublicoHero({
  perfil,
  profileId,
  isSelf,
  hasProfessor,
  hasOrganizador,
  hasEspaco,
  vitT,
  derT,
  winRate,
  jogosT,
  conquistas,
  amistosoPerfilOn,
  amistosoPerfilExpiresAt,
}: PerfilPublicoHeroProps) {
  const id = profileId;
  return (
    <div id="perfil-hero-panel" className={`${PROFILE_HERO_PANEL_CLASS} mt-0 sm:mt-1`}>
      <div id="perfil-hero-cover" className="relative h-24 w-full sm:h-28">
        {perfil.foto_capa ? (
          <>
            <img src={perfil.foto_capa} alt="" className="h-full w-full object-cover object-center" />
            <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-eid-card/60 to-transparent" />
          </>
        ) : (
          <>
            <div
              className="h-full w-full"
              style={{ background: "linear-gradient(135deg,#172554 0%,#0b1d2e 55%,#0b0f14 100%)" }}
            />
            <div
              className="absolute -right-6 -top-6 h-28 w-28 rounded-full blur-2xl opacity-35"
              style={{ background: "var(--eid-action-500)" }}
            />
            <div
              className="absolute -left-4 bottom-0 h-20 w-20 rounded-full blur-2xl opacity-20"
              style={{ background: "var(--eid-primary-400)" }}
            />
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{ backgroundImage: "repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 1px,transparent 14px)" }}
            />
          </>
        )}

        <div className="absolute right-2 top-2 z-[3] flex items-center gap-1.5">
          {isSelf ? <ProfileCoverControl hasCover={Boolean(perfil.foto_capa)} /> : null}
          {!isSelf ? <ProfileDenunciarButton alvoUsuarioId={id} compact /> : null}
        </div>

        {isSelf ? (
          <ProfileEditDrawerTrigger
            href={`/editar/perfil?from=${encodeURIComponent(`/perfil/${id}`)}`}
            title="Editar perfil"
            fullscreen
            topMode="backOnly"
            className="absolute -bottom-[22px] right-2 z-[4] inline-flex items-center justify-center gap-1 rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/70 px-2.5 py-1 text-[8px] font-bold uppercase leading-none tracking-[0.08em] text-eid-text-secondary shadow-[0_3px_10px_-7px_rgba(2,6,23,0.6)] transition-all hover:border-eid-primary-500/35 hover:bg-eid-primary-500/10 hover:text-eid-fg"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="h-2.5 w-2.5" aria-hidden>
              <path d="M11.875 1.625a1.768 1.768 0 0 1 2.5 2.5l-7.54 7.54a1 1 0 0 1-.46.262l-3.018.805a.5.5 0 0 1-.612-.612l.805-3.018a1 1 0 0 1 .262-.46l7.54-7.54Zm1.793 1.207a.768.768 0 0 0-1.086 0l-.812.812 1.086 1.086.812-.812a.768.768 0 0 0 0-1.086ZM11.149 5.29 4.314 12.126l-1.02.272.272-1.02L10.4 4.544l.75.75Z" />
            </svg>
            EDITAR PERFIL
          </ProfileEditDrawerTrigger>
        ) : null}
      </div>

      <div className="px-3 pb-4 pt-0">
        <div className="relative z-[3] -mt-3 min-h-[68px] sm:-mt-4">
          <div className="absolute left-0 top-0 z-10 h-[68px] w-[68px]">
            {perfil.avatar_url ? (
              <img
                src={perfil.avatar_url}
                alt=""
                className={`h-[68px] w-[68px] rounded-full border-[3px] object-cover ${
                  amistosoPerfilOn
                    ? "border-emerald-400 shadow-[0_0_0_2px_rgba(16,185,129,0.55),0_6px_20px_rgba(0,0,0,0.5)]"
                    : "border-red-500 shadow-[0_0_0_2px_rgba(239,68,68,0.55),0_6px_20px_rgba(0,0,0,0.5)]"
                }`}
              />
            ) : (
              <div
                className={`flex h-[68px] w-[68px] items-center justify-center rounded-full border-[3px] bg-gradient-to-br from-eid-primary-700 to-eid-primary-900 text-sm font-black tracking-tight text-eid-primary-200 ${
                  amistosoPerfilOn
                    ? "border-emerald-400 shadow-[0_0_0_2px_rgba(16,185,129,0.55),0_6px_20px_rgba(0,0,0,0.5)]"
                    : "border-red-500 shadow-[0_0_0_2px_rgba(239,68,68,0.55),0_6px_20px_rgba(0,0,0,0.5)]"
                }`}
              >
                {iniciaisPerfilPublico(perfil.nome)}
              </div>
            )}
            {isSelf ? <ProfileAvatarControl hasAvatar={Boolean(perfil.avatar_url)} /> : null}
          </div>
          <div className="min-w-0 pl-[calc(68px+0.75rem)] pt-6 pb-1 sm:pt-8">
            <div className="flex flex-wrap items-center gap-1.5">
              <h1 className="break-words text-[13px] font-black leading-tight tracking-tight text-eid-fg sm:text-sm">
                {perfil.nome ?? "Atleta"}
              </h1>
              <div className="flex flex-wrap items-center gap-1">
                <span className={PROFILE_HERO_ROLE_BADGE_CLASS}>
                  {perfil.tipo_usuario === "organizador" ? "Organizador" : "Atleta"}
                </span>
                {hasProfessor ? <span className={PROFILE_HERO_ROLE_BADGE_CLASS}>Professor</span> : null}
                {hasOrganizador ? <span className={PROFILE_HERO_ROLE_BADGE_CLASS}>Organizador</span> : null}
                {hasEspaco ? <span className={PROFILE_HERO_ROLE_BADGE_CLASS}>Espaço</span> : null}
              </div>
            </div>
            {perfil.username || perfil.localizacao ? (
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px]">
                {perfil.username ? <p className="font-semibold text-eid-primary-400">@{perfil.username}</p> : null}
                {perfil.username && perfil.localizacao ? (
                  <span
                    className="h-2.5 w-px rounded-full bg-[color:color-mix(in_srgb,var(--eid-primary-500)_32%,var(--eid-border-subtle)_68%)]"
                    aria-hidden
                  />
                ) : null}
                {perfil.localizacao ? (
                  <div className="rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-1.5 py-1">
                    <EidCityState location={perfil.localizacao} compact align="start" layout="inline" />
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {perfil.bio ? (
          <p className="mt-4 line-clamp-2 text-[11px] leading-relaxed text-eid-text-secondary">{perfil.bio}</p>
        ) : null}

        <div className="mt-4 grid grid-cols-4 divide-x divide-transparent rounded-xl border border-transparent bg-eid-surface/40 text-center shadow-none">
          <div className="py-2">
            <p className="text-sm font-black text-eid-fg">{vitT}</p>
            <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Vitórias</p>
          </div>
          <div className="py-2">
            <p className="text-sm font-black text-eid-fg">{derT}</p>
            <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Derrotas</p>
          </div>
          <div className="py-2">
            <p className="text-sm font-black text-eid-action-500">{winRate != null ? `${winRate}%` : "—"}</p>
            <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Win Rate</p>
          </div>
          <div className="py-2">
            <p className="text-sm font-black text-eid-primary-400">{jogosT}</p>
            <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Jogos</p>
          </div>
        </div>

        <div className="mt-3 flex flex-nowrap items-center gap-x-2 overflow-x-auto pb-0.5">
          {perfil.altura_cm ? (
            <p className="shrink-0 whitespace-nowrap text-[9px] text-eid-text-secondary">
              Altura <span className="font-semibold text-eid-fg">{perfil.altura_cm} cm</span>
            </p>
          ) : null}
          {perfil.peso_kg ? (
            <p className="shrink-0 whitespace-nowrap text-[9px] text-eid-text-secondary">
              Peso <span className="font-semibold text-eid-fg">{perfil.peso_kg} kg</span>
            </p>
          ) : null}
          {perfil.lado ? (
            <p className="shrink-0 whitespace-nowrap text-[9px] text-eid-text-secondary">
              Lado <span className="font-semibold text-eid-fg">{perfil.lado}</span>
            </p>
          ) : null}
          <div className="ml-auto inline-flex shrink-0 items-center whitespace-nowrap">
            <span className="mr-1 text-[9px] text-eid-text-secondary">Amistoso</span>
            <ProfileFriendlyStatusToggle
              userId={id}
              initialOn={amistosoPerfilOn}
              initialExpiresAt={amistosoPerfilExpiresAt}
              canToggle={isSelf}
            />
          </div>
          {perfil.estilo_jogo ? (
            <p className="shrink-0 whitespace-nowrap text-[9px] text-eid-text-secondary">
              Estilo <span className="font-semibold text-eid-fg">{perfil.estilo_jogo}</span>
            </p>
          ) : null}
        </div>

        {conquistas.length > 0 && (() => {
          const cfg: Record<string, { icon: string; color: string; glow: string }> = {
            "EID Elite": { icon: "👑", color: "#f59e0b", glow: "rgba(245,158,11,0.18)" },
            "Top 10": { icon: "🥇", color: "#f97316", glow: "rgba(249,115,22,0.18)" },
            "Winrate 60%+": { icon: "⚡", color: "#22c55e", glow: "rgba(34,197,94,0.18)" },
            "Multi-esporte": { icon: "🎯", color: "#3b82f6", glow: "rgba(59,130,246,0.18)" },
          };
          return (
            <div className="mt-4">
              <p className="mb-1.5 text-[8px] font-bold uppercase tracking-widest text-eid-text-secondary">Conquistas</p>
              <div className="flex flex-wrap gap-1.5">
                {conquistas.map((nome) => {
                  const b = cfg[nome] ?? { icon: "🏅", color: "#6366f1", glow: "rgba(99,102,241,0.18)" };
                  return (
                    <span
                      key={nome}
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wide"
                      style={{
                        background: b.glow,
                        color: b.color,
                        border: `1px solid ${b.color}50`,
                        boxShadow: `0 0 8px ${b.glow}`,
                      }}
                    >
                      <span>{b.icon}</span>
                      {nome}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
