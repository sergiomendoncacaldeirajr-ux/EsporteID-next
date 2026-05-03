import Image from "next/image";
import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CandidaturaResponseActions } from "@/components/vagas/candidatura-response-actions";
import { ProfileEditDrawerTrigger } from "@/components/perfil/profile-edit-drawer-trigger";
import { EidCollapsiblePanel } from "@/components/ui/eid-collapsible-panel";

export type TimesStreamPedidosProps = {
  supabase: SupabaseClient;
  userId: string;
};

export async function TimesStreamPedidos({ supabase, userId }: TimesStreamPedidosProps) {
  const { data: pedidosRaw } = await supabase
    .from("time_candidaturas")
    .select("id, time_id, mensagem, criado_em, candidato_usuario_id, times!inner(id, nome, criador_id)")
    .eq("status", "pendente")
    .eq("times.criador_id", userId)
    .order("criado_em", { ascending: false })
    .limit(40);

  const pedidos = pedidosRaw ?? [];
  const candIds = [...new Set(pedidos.map((p) => p.candidato_usuario_id as string))];
  const { data: candProfiles } =
    candIds.length > 0
      ? await supabase.from("profiles").select("id, nome, username, avatar_url").in("id", candIds)
      : { data: [] as { id: string; nome: string | null; username: string | null; avatar_url: string | null }[] };
  const profileMap = new Map((candProfiles ?? []).map((r) => [r.id, r]));

  return (
    <section id="pedidos-elenco" className="mb-4 scroll-mt-24">
      <EidCollapsiblePanel
        title="Pedidos para o seu elenco"
        defaultOpen={false}
        summaryRight={
          pedidos.length > 0 ? (
            <span className="inline-flex shrink-0 rounded-full border border-eid-action-500/35 bg-eid-action-500/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.06em] text-eid-action-400">
              {pedidos.length} pendente{pedidos.length > 1 ? "s" : ""}
            </span>
          ) : (
            <span className="inline-flex shrink-0 rounded-full border border-transparent bg-eid-surface/50 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.06em] text-eid-text-secondary">
              sem pendências
            </span>
          )
        }
      >
        {pedidos.length > 0 ? (
          <>
            <p className="px-1 text-xs text-eid-text-secondary">
              Quem pediu para entrar nas suas formações. Aprovar adiciona a pessoa ao elenco e recusar avisa o candidato.
            </p>
            <ul className="space-y-3">
              {pedidos.map((raw) => {
                const p = raw as {
                  id: number;
                  time_id: number;
                  mensagem: string | null;
                  criado_em: string;
                  candidato_usuario_id: string;
                  times: { id: number; nome: string | null; criador_id: string } | { id: number; nome: string | null; criador_id: string }[];
                };
                const team = Array.isArray(p.times) ? p.times[0] : p.times;
                const prof = profileMap.get(p.candidato_usuario_id);
                const label = prof?.nome?.trim() || prof?.username?.trim() || "Atleta";
                const sub = prof?.username?.trim() && prof?.username !== prof?.nome ? `@${prof.username}` : null;
                return (
                  <li
                    key={p.id}
                    className="rounded-2xl border border-transparent bg-[color:color-mix(in_srgb,var(--eid-card)_92%,var(--eid-surface)_8%)] p-3 sm:flex sm:items-stretch sm:gap-3 sm:p-4"
                  >
                    <div className="flex shrink-0 items-center gap-3">
                      <ProfileEditDrawerTrigger
                        href={`/perfil/${p.candidato_usuario_id}?from=/times`}
                        title={label}
                        fullscreen
                        topMode="backOnly"
                        className="block rounded-xl border border-transparent transition hover:border-eid-primary-500/35"
                      >
                        <div className="relative h-12 w-12 overflow-hidden rounded-xl border border-eid-primary-500/30 bg-eid-surface">
                          {prof?.avatar_url ? (
                            <Image src={prof.avatar_url} alt="" width={48} height={48} unoptimized className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-sm font-black text-eid-primary-300">
                              {label.slice(0, 1).toUpperCase()}
                            </div>
                          )}
                        </div>
                      </ProfileEditDrawerTrigger>
                      <div className="min-w-0 sm:hidden">
                        <p className="text-sm font-bold text-eid-fg">{label}</p>
                        {sub ? <p className="text-[11px] text-eid-text-secondary">{sub}</p> : null}
                      </div>
                    </div>
                    <div className="mt-3 min-w-0 flex-1 sm:mt-0">
                      <div className="hidden items-center gap-2 sm:flex">
                        <Link href={`/perfil/${p.candidato_usuario_id}?from=/times`} className="text-sm font-bold text-eid-fg hover:text-eid-primary-300">
                          {label}
                        </Link>
                        {sub ? <span className="text-[11px] text-eid-text-secondary">{sub}</span> : null}
                      </div>
                      <p className="mt-1 text-[11px] text-eid-text-secondary">
                        Quer entrar em <span className="font-semibold text-eid-fg">{team?.nome ?? "sua formação"}</span>
                      </p>
                      {p.mensagem?.trim() ? (
                        <p className="mt-2 rounded-lg border border-transparent bg-eid-surface/40 px-2.5 py-2 text-[11px] italic text-eid-text-secondary">
                          “{p.mensagem.trim()}”
                        </p>
                      ) : null}
                      <CandidaturaResponseActions candidaturaId={p.id} className="mt-2 gap-1.5" />
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <p className="px-1 py-1 text-xs text-eid-text-secondary">Nenhum pedido pendente no momento.</p>
        )}
      </EidCollapsiblePanel>
    </section>
  );
}
