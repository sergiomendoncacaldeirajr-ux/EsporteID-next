import Link from "next/link";
import { redirect } from "next/navigation";
import { ConexoesStrip, type ConexaoPeer } from "@/components/agenda/conexoes-strip";
import { PartidaAgendaCard } from "@/components/agenda/partida-agenda-card";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Agenda",
  description: "Jogos agendados e lembretes no EsporteID",
};

type EspNome = { nome?: string | null };
type PartidaRow = {
  id: number;
  esporte_id: number | null;
  jogador1_id: string | null;
  jogador2_id: string | null;
  data_registro: string | null;
  data_partida: string | null;
  local_str: string | null;
  local_espaco_id: number | null;
  status: string | null;
  esportes?: EspNome | EspNome[] | null;
};

function firstOf<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

export default async function AgendaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/agenda");

  const { data: profile } = await supabase
    .from("profiles")
    .select("termos_aceitos_em, perfil_completo")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.termos_aceitos_em) redirect("/conta/aceitar-termos");
  if (!profile.perfil_completo) redirect("/onboarding");

  const { data: aceitos } = await supabase
    .from("matches")
    .select("usuario_id, adversario_id")
    .eq("status", "Aceito")
    .or(`usuario_id.eq.${user.id},adversario_id.eq.${user.id}`)
    .limit(200);

  const peerIds = new Set<string>();
  for (const m of aceitos ?? []) {
    if (m.usuario_id && m.usuario_id !== user.id) peerIds.add(m.usuario_id);
    if (m.adversario_id && m.adversario_id !== user.id) peerIds.add(m.adversario_id);
  }
  const peerList = [...peerIds];
  const { data: peerProfiles } = peerList.length
    ? await supabase.from("profiles").select("id, nome, avatar_url").in("id", peerList)
    : { data: [] };
  const conexoes: ConexaoPeer[] = (peerProfiles ?? []).map((p) => ({
    id: p.id,
    nome: p.nome,
    avatar_url: p.avatar_url,
  }));

  const { data: partidasAgendadas } = await supabase
    .from("partidas")
    .select(
      "id, esporte_id, jogador1_id, jogador2_id, data_registro, data_partida, local_str, local_espaco_id, status, esportes(nome)"
    )
    .or(`jogador1_id.eq.${user.id},jogador2_id.eq.${user.id},usuario_id.eq.${user.id}`)
    .eq("status", "agendada")
    .order("data_partida", { ascending: true, nullsFirst: false })
    .order("data_registro", { ascending: true })
    .limit(40);

  const { data: placarPendente } = await supabase
    .from("partidas")
    .select(
      "id, esporte_id, jogador1_id, jogador2_id, data_registro, data_partida, local_str, local_espaco_id, status, esportes(nome)"
    )
    .or(`jogador1_id.eq.${user.id},jogador2_id.eq.${user.id}`)
    .eq("status", "aguardando_confirmacao")
    .neq("lancado_por", user.id)
    .order("data_registro", { ascending: false })
    .limit(20);

  const allLocalIds = [
    ...new Set(
      [...(partidasAgendadas ?? []), ...(placarPendente ?? [])]
        .map((p) => p.local_espaco_id)
        .filter((x): x is number => typeof x === "number" && x > 0)
    ),
  ];
  const { data: locaisRows } = allLocalIds.length
    ? await supabase.from("espacos_genericos").select("id, nome_publico").in("id", allLocalIds)
    : { data: [] };
  const locMap = new Map((locaisRows ?? []).map((l) => [l.id, l.nome_publico]));

  const allPlayerIds = new Set<string>();
  for (const p of [...(partidasAgendadas ?? []), ...(placarPendente ?? [])]) {
    if (p.jogador1_id) allPlayerIds.add(p.jogador1_id);
    if (p.jogador2_id) allPlayerIds.add(p.jogador2_id);
  }
  const playerList = [...allPlayerIds];
  const { data: nomeRows } = playerList.length
    ? await supabase.from("profiles").select("id, nome").in("id", playerList)
    : { data: [] };
  const nomeMap = new Map((nomeRows ?? []).map((r) => [r.id, r.nome]));

  const { data: pendentesEnvio } = await supabase
    .from("matches")
    .select("id, status, modalidade_confronto, data_solicitacao, data_registro, adversario_id, esporte_id")
    .eq("usuario_id", user.id)
    .eq("status", "Pendente")
    .order("data_registro", { ascending: false })
    .limit(20);

  const advIds = [...new Set((pendentesEnvio ?? []).map((m) => m.adversario_id).filter(Boolean))] as string[];
  const { data: adversarios } = advIds.length
    ? await supabase.from("profiles").select("id, nome, avatar_url").in("id", advIds)
    : { data: [] };
  const advMap = new Map((adversarios ?? []).map((p) => [p.id, p]));

  const eids = [...new Set((pendentesEnvio ?? []).map((m) => m.esporte_id).filter(Boolean))] as number[];
  const { data: esportes } = eids.length
    ? await supabase.from("esportes").select("id, nome").in("id", eids)
    : { data: [] };
  const espMap = new Map((esportes ?? []).map((e) => [e.id, e.nome]));

  const nAgendadas = partidasAgendadas?.length ?? 0;
  const nPlacar = placarPendente?.length ?? 0;
  const nPendEnvio = pendentesEnvio?.length ?? 0;

  function localLabel(p: PartidaRow) {
    if (p.local_str?.trim()) return p.local_str.trim();
    if (p.local_espaco_id) return locMap.get(p.local_espaco_id) ?? null;
    return null;
  }

  return (
    <>
      <DashboardTopbar />
      <main className="mx-auto w-full max-w-lg px-3 py-3 sm:max-w-2xl sm:px-6 sm:py-4">
        <div className="eid-surface-panel relative rounded-xl p-3 md:relative md:overflow-hidden md:rounded-3xl md:border-eid-primary-500/25 md:bg-gradient-to-br md:from-eid-card md:via-eid-primary-500/10 md:to-eid-card md:p-6 md:shadow-lg md:shadow-eid-primary-500/10">
          <div className="pointer-events-none absolute -right-16 -top-16 hidden h-40 w-40 rounded-full bg-eid-primary-500/20 blur-3xl md:block" />
          <h1 className="text-lg font-bold tracking-tight text-eid-fg md:text-2xl md:font-black">Agenda</h1>
          <p className="mt-1 hidden text-sm leading-relaxed text-eid-text-secondary md:mt-2 md:block">
            Conexões, jogos agendados e pendências de placar, em um só fluxo.
          </p>
          <div className="mt-3 grid grid-cols-3 gap-1.5 text-center md:mt-5 md:gap-2">
            <div className="eid-list-item rounded-lg bg-eid-bg/40 px-1 py-2 md:rounded-2xl md:px-2 md:py-3">
              <p className="text-base font-bold tabular-nums text-eid-primary-300 md:text-xl md:font-black">{nAgendadas}</p>
              <p className="text-[8px] font-semibold uppercase tracking-wide text-eid-text-secondary md:text-[9px] md:font-bold">Agendados</p>
            </div>
            <div className="eid-list-item rounded-lg border-eid-action-500/30 bg-eid-action-500/10 px-1 py-2 md:rounded-2xl md:px-2 md:py-3">
              <p className="text-base font-bold tabular-nums text-eid-action-500 md:text-xl md:font-black">{nPlacar}</p>
              <p className="text-[8px] font-semibold uppercase tracking-wide text-eid-text-secondary md:text-[9px] md:font-bold">Placar</p>
            </div>
            <div className="eid-list-item rounded-lg bg-eid-bg/40 px-1 py-2 md:rounded-2xl md:px-2 md:py-3">
              <p className="text-base font-bold tabular-nums text-eid-fg md:text-xl md:font-black">{nPendEnvio}</p>
              <p className="text-[8px] font-semibold uppercase tracking-wide text-eid-text-secondary md:text-[9px] md:font-bold">Enviei</p>
            </div>
          </div>
          <Link
            href="/match"
            className="eid-btn-primary relative mt-3 flex min-h-[44px] w-full items-center justify-center rounded-lg text-xs font-bold uppercase tracking-wide md:mt-5 md:min-h-[50px] md:rounded-2xl md:text-sm md:font-black"
          >
            Abrir radar Match
          </Link>
        </div>

        <ConexoesStrip peers={conexoes} />

        <section className="mt-6 md:mt-10" id="placares">
          <h2 className="text-[10px] font-black uppercase tracking-[0.16em] text-eid-action-500">Placar aguardando você</h2>
          {(placarPendente ?? []).length === 0 ? (
            <p className="eid-list-item mt-3 rounded-2xl border-dashed bg-eid-card/50 p-5 text-center text-sm text-eid-text-secondary">
              Nenhum placar pendente de confirmação.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              {(placarPendente ?? []).map((row) => {
                const esp = firstOf(row.esportes);
                const pr = row as PartidaRow;
                return (
                  <PartidaAgendaCard
                    key={pr.id}
                    id={pr.id}
                    esporteNome={esp?.nome ?? "Esporte"}
                    j1Nome={pr.jogador1_id ? nomeMap.get(pr.jogador1_id) ?? null : null}
                    j2Nome={pr.jogador2_id ? nomeMap.get(pr.jogador2_id) ?? null : null}
                    dataRef={pr.data_partida ?? pr.data_registro}
                    localLabel={localLabel(pr)}
                    variant="placar"
                  />
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-6 md:mt-10">
          <h2 className="text-[10px] font-black uppercase tracking-[0.16em] text-eid-primary-500">Jogos agendados</h2>
          {(partidasAgendadas ?? []).length === 0 ? (
            <div className="eid-list-item mt-4 rounded-[22px] border-2 border-dashed bg-eid-card/40 py-10 text-center">
              <p className="text-sm font-bold text-eid-fg">Nenhuma pendência</p>
              <p className="mt-1 text-xs text-eid-text-secondary">Sua agenda está em dia. Combine um match no radar.</p>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {(partidasAgendadas ?? []).map((row) => {
                const esp = firstOf(row.esportes);
                const pr = row as PartidaRow;
                return (
                  <PartidaAgendaCard
                    key={pr.id}
                    id={pr.id}
                    esporteNome={esp?.nome ?? "Esporte"}
                    j1Nome={pr.jogador1_id ? nomeMap.get(pr.jogador1_id) ?? null : null}
                    j2Nome={pr.jogador2_id ? nomeMap.get(pr.jogador2_id) ?? null : null}
                    dataRef={pr.data_partida ?? pr.data_registro}
                    localLabel={localLabel(pr)}
                    variant="agendada"
                  />
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-6 md:mt-10">
          <h2 className="text-[10px] font-black uppercase tracking-[0.16em] text-eid-text-secondary">Pedidos que você enviou</h2>
          {(pendentesEnvio ?? []).length === 0 ? (
            <p className="eid-list-item mt-3 rounded-2xl bg-eid-card/80 p-4 text-sm text-eid-text-secondary">
              Você não tem pedidos aguardando resposta.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {(pendentesEnvio ?? []).map((m) => {
                const adv = m.adversario_id ? advMap.get(m.adversario_id) : null;
                const esp = m.esporte_id ? espMap.get(m.esporte_id) : null;
                return (
                  <li
                    key={m.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card px-4 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {adv?.avatar_url ? (
                        <img src={adv.avatar_url} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
                      ) : (
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-eid-surface text-[10px] font-black text-eid-primary-300">
                          EID
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-bold text-eid-fg">{adv?.nome ?? "Oponente"}</p>
                        <p className="text-xs text-eid-text-secondary">
                          {esp ?? "Esporte"} · {m.modalidade_confronto ?? "individual"}
                        </p>
                      </div>
                    </div>
                    <span className="eid-badge-warning rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase">
                      Aguardando
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <p className="mt-6 text-center text-xs text-eid-text-secondary md:mt-10">
          Pedidos recebidos para aceitar estão em{" "}
          <Link href="/comunidade" className="font-bold text-eid-primary-300 hover:underline">
            Social
          </Link>
          .
        </p>
      </main>
    </>
  );
}
