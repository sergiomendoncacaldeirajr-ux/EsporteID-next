import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canLaunchTorneioScore, getTorneioStaffAccess } from "@/lib/torneios/staff";

type Props = { params: Promise<{ id: string }> };

export default async function RegistrarPlacarPage({ params }: Props) {
  const raw = (await params).id;
  const id = Number(raw);
  if (!Number.isFinite(id) || id < 1) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/registrar-placar/${id}`);

  const { data: p } = await supabase
    .from("partidas")
    .select("id, jogador1_id, jogador2_id, status, esporte_id, torneio_id, esportes(nome)")
    .eq("id", id)
    .maybeSingle();

  if (!p) notFound();

  const participant = p.jogador1_id === user.id || p.jogador2_id === user.id;
  const torneioAccess = p.torneio_id ? await getTorneioStaffAccess(supabase, Number(p.torneio_id), user.id) : null;
  const podeRegistrarTorneio = torneioAccess ? canLaunchTorneioScore(torneioAccess) : false;
  if (p.torneio_id) {
    if (!podeRegistrarTorneio) notFound();
  } else if (!participant) {
    notFound();
  }

  const esp = Array.isArray(p.esportes) ? p.esportes[0] : p.esportes;

  const { data: j1 } = p.jogador1_id
    ? await supabase.from("profiles").select("nome").eq("id", p.jogador1_id).maybeSingle()
    : { data: null };
  const { data: j2 } = p.jogador2_id
    ? await supabase.from("profiles").select("nome").eq("id", p.jogador2_id).maybeSingle()
    : { data: null };

  return (
    <main className="mx-auto w-full max-w-lg px-3 py-4 sm:max-w-xl sm:px-4 sm:py-6">
        <Link
          href="/agenda"
          className="inline-flex text-xs font-semibold text-eid-primary-400 underline-offset-2 transition hover:text-eid-primary-300 hover:underline"
        >
          ← Voltar à agenda
        </Link>

        <div className="mt-4 overflow-hidden rounded-2xl border border-[color:color-mix(in_srgb,var(--eid-action-500)_32%,var(--eid-border-subtle)_68%)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-action-500)_10%,var(--eid-card)_90%),color-mix(in_srgb,var(--eid-surface)_95%,transparent))] p-4 shadow-[0_12px_24px_-16px_rgba(15,23,42,0.28)] backdrop-blur-sm sm:mt-6 sm:p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-eid-action-400">Registrar placar</p>
          <h1 className="mt-2 text-lg font-black tracking-tight text-transparent bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-fg)_96%,white_4%),color-mix(in_srgb,var(--eid-action-500)_72%,var(--eid-fg)_28%))] bg-clip-text md:text-xl">
            Partida #{id}
          </h1>
          <p className="mt-1 text-sm font-semibold text-eid-primary-300">{esp?.nome ?? "Esporte"}</p>
          <p className="mt-2 text-xs text-eid-text-secondary">Status atual: {p.status ?? "—"}</p>
          {p.torneio_id ? (
            <p className="mt-2 text-xs text-eid-action-400">
              Partida de torneio: o lançamento é restrito ao organizador e aos lançadores autorizados.
            </p>
          ) : null}

          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-[color:var(--eid-border-subtle)] bg-[color-mix(in_srgb,var(--eid-bg)_35%,var(--eid-surface)_65%)] px-3 py-3 sm:mt-6 sm:rounded-2xl sm:px-4 sm:py-4">
            <div className="min-w-0 flex-1 text-center">
              <p className="truncate text-sm font-bold text-eid-fg md:font-black">{j1?.nome ?? "Jogador 1"}</p>
            </div>
            <span className="text-[10px] font-black text-eid-text-secondary">VS</span>
            <div className="min-w-0 flex-1 text-center">
              <p className="truncate text-sm font-bold text-eid-fg md:font-black">{j2?.nome ?? "Jogador 2"}</p>
            </div>
          </div>

          <p className="mt-6 text-sm leading-relaxed text-eid-text-secondary">
            Em breve você poderá informar sets ou games, enviar para o oponente confirmar e acompanhar o histórico da disputa
            nesta tela.
          </p>

          <div className="mt-6 rounded-2xl border border-dashed border-[color:color-mix(in_srgb,var(--eid-primary-500)_40%,var(--eid-border-subtle)_60%)] bg-eid-primary-500/5 p-4 text-center text-xs text-eid-text-secondary">
            Registro de placar, anexos e histórico de disputas serão habilitados em uma atualização futura.
          </div>
        </div>
      </main>
  );
}
