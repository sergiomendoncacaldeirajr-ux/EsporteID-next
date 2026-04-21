import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DashboardTopbar } from "@/components/dashboard/topbar";
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
    <>
      <DashboardTopbar />
      <main className="mx-auto w-full max-w-lg px-3 py-4 sm:max-w-xl sm:px-4 sm:py-6">
        <Link href="/agenda" className="text-xs font-bold text-eid-primary-300 hover:underline">
          ← Voltar à agenda
        </Link>

        <div className="mt-4 overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4 sm:mt-6 md:rounded-3xl md:border-eid-action-500/30 md:bg-gradient-to-br md:from-eid-action-500/15 md:via-eid-card md:to-eid-card md:p-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-eid-action-500 md:font-black">Registrar placar</p>
          <h1 className="mt-2 text-lg font-bold text-eid-fg md:text-xl md:font-black">Partida #{id}</h1>
          <p className="mt-1 text-sm text-eid-primary-300">{esp?.nome ?? "Esporte"}</p>
          <p className="mt-2 text-xs text-eid-text-secondary">Status atual: {p.status ?? "—"}</p>
          {p.torneio_id ? (
            <p className="mt-2 text-xs text-eid-action-400">
              Partida de torneio: o lançamento é restrito ao organizador e aos lançadores autorizados.
            </p>
          ) : null}

          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-bg/50 px-3 py-3 sm:mt-6 sm:rounded-2xl sm:px-4 sm:py-4">
            <div className="min-w-0 flex-1 text-center">
              <p className="truncate text-sm font-semibold text-eid-fg md:font-black">{j1?.nome ?? "Jogador 1"}</p>
            </div>
            <span className="text-[10px] font-bold text-eid-text-secondary md:font-black">VS</span>
            <div className="min-w-0 flex-1 text-center">
              <p className="truncate text-sm font-semibold text-eid-fg md:font-black">{j2?.nome ?? "Jogador 2"}</p>
            </div>
          </div>

          <p className="mt-6 text-sm leading-relaxed text-eid-text-secondary">
            Em breve você poderá informar sets ou games, enviar para o oponente confirmar e acompanhar o histórico da disputa
            nesta tela.
          </p>

          <div className="mt-6 rounded-2xl border border-dashed border-eid-primary-500/35 bg-eid-primary-500/5 p-4 text-center text-xs text-eid-text-secondary">
            Registro de placar, anexos e histórico de disputas serão habilitados em uma atualização futura.
          </div>
        </div>
      </main>
    </>
  );
}
