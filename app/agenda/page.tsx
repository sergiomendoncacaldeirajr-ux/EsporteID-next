import Link from "next/link";
import { redirect } from "next/navigation";
import { ConexoesStrip, type ConexaoPeer } from "@/components/agenda/conexoes-strip";
import { AgendaAceitosCancelaveis } from "@/components/agenda/agenda-aceitos-cancelaveis";
import { PartidaAgendaCard } from "@/components/agenda/partida-agenda-card";
import {
  type AgendaPartidaCardRow,
  fetchPartidasAgendadasUsuario,
  firstOfRelation,
  getAgendaTeamContext,
} from "@/lib/agenda/partidas-usuario";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Agenda",
  description: "Jogos agendados e lembretes no EsporteID",
};

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

  await supabase.rpc("auto_aprovar_resultados_pendentes", { p_only_user: user.id });
  const { teamClause } = await getAgendaTeamContext(supabase, user.id);

  const { data: aceitos } = await supabase
    .from("matches")
    .select("usuario_id, adversario_id")
    .eq("status", "Aceito")
    .or(`usuario_id.eq.${user.id},adversario_id.eq.${user.id}`)
    .order("data_confirmacao", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .limit(200);

  const seenPeer = new Set<string>();
  const peerList: string[] = [];
  for (const m of aceitos ?? []) {
    if (m.usuario_id && m.usuario_id !== user.id && !seenPeer.has(m.usuario_id)) {
      seenPeer.add(m.usuario_id);
      peerList.push(m.usuario_id);
    }
    if (m.adversario_id && m.adversario_id !== user.id && !seenPeer.has(m.adversario_id)) {
      seenPeer.add(m.adversario_id);
      peerList.push(m.adversario_id);
    }
  }

  const { data: peerProfiles } = peerList.length
    ? await supabase
        .from("profiles")
        .select("id, nome, avatar_url, disponivel_amistoso, disponivel_amistoso_ate")
        .in("id", peerList)
    : { data: [] };
  const profileById = new Map((peerProfiles ?? []).map((p) => [p.id, p]));
  const conexoes: ConexaoPeer[] = peerList
    .map((id) => profileById.get(id))
    .filter((p): p is NonNullable<typeof p> => p != null)
    .map((p) => ({
      id: p.id,
      nome: p.nome,
      avatar_url: p.avatar_url,
      disponivel_amistoso: p.disponivel_amistoso,
      disponivel_amistoso_ate: p.disponivel_amistoso_ate,
    }));

  const { data: partidasAgendadas } = await fetchPartidasAgendadasUsuario(supabase, user.id, teamClause);

  const allLocalIds = [
    ...new Set(
      (partidasAgendadas ?? [])
        .map((p) => p.local_espaco_id)
        .filter((x): x is number => typeof x === "number" && x > 0)
    ),
  ];
  const { data: locaisRows } = allLocalIds.length
    ? await supabase.from("espacos_genericos").select("id, nome_publico").in("id", allLocalIds)
    : { data: [] };
  const locMap = new Map((locaisRows ?? []).map((l) => [l.id, l.nome_publico]));

  const allPlayerIds = new Set<string>();
  for (const p of partidasAgendadas ?? []) {
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
    .order("data_registro", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .limit(20);

  const { data: aceitosCancelaveis } = await supabase
    .from("matches")
    .select("id, usuario_id, adversario_id, modalidade_confronto, esporte_id")
    .eq("status", "Aceito")
    .eq("finalidade", "ranking")
    .or(`usuario_id.eq.${user.id},adversario_id.eq.${user.id}`)
    .order("data_confirmacao", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .limit(20);

  const advIds = [...new Set((pendentesEnvio ?? []).map((m) => m.adversario_id).filter(Boolean))] as string[];
  const { data: adversarios } = advIds.length
    ? await supabase.from("profiles").select("id, nome, avatar_url").in("id", advIds)
    : { data: [] };
  const advMap = new Map((adversarios ?? []).map((p) => [p.id, p]));

  const eids = [...new Set((pendentesEnvio ?? []).map((m) => m.esporte_id).filter(Boolean))] as number[];
  const eidsAceitos = [...new Set((aceitosCancelaveis ?? []).map((m) => m.esporte_id).filter(Boolean))] as number[];
  const { data: esportes } = eids.length
    ? await supabase.from("esportes").select("id, nome").in("id", eids)
    : { data: [] };
  const { data: esportesAceitos } = eidsAceitos.length
    ? await supabase.from("esportes").select("id, nome").in("id", eidsAceitos)
    : { data: [] };
  const espMap = new Map((esportes ?? []).map((e) => [e.id, e.nome]));
  const espMapAceitos = new Map((esportesAceitos ?? []).map((e) => [e.id, e.nome]));

  const oponenteIdsAceitos = [
    ...new Set(
      (aceitosCancelaveis ?? [])
        .map((m) => (m.usuario_id === user.id ? m.adversario_id : m.usuario_id))
        .filter((x): x is string => typeof x === "string" && x.length > 0)
    ),
  ];
  const { data: oponentesAceitos } = oponenteIdsAceitos.length
    ? await supabase.from("profiles").select("id, nome").in("id", oponenteIdsAceitos)
    : { data: [] };
  const oponenteMapAceitos = new Map((oponentesAceitos ?? []).map((p) => [p.id, p.nome ?? "Oponente"]));
  const aceitosItems = (aceitosCancelaveis ?? []).map((m) => {
    const opp = m.usuario_id === user.id ? m.adversario_id : m.usuario_id;
    return {
      id: Number(m.id),
      nomeOponente: (opp ? oponenteMapAceitos.get(opp) : null) ?? "Oponente",
      esporte: (m.esporte_id ? espMapAceitos.get(m.esporte_id) : null) ?? "Esporte",
      modalidade: m.modalidade_confronto ?? "individual",
    };
  });

  function localLabel(p: AgendaPartidaCardRow) {
    if (p.local_str?.trim()) return p.local_str.trim();
    if (p.local_espaco_id) return locMap.get(p.local_espaco_id) ?? null;
    return null;
  }

  return (
    <main className="mx-auto w-full max-w-lg px-3 py-3 pb-[calc(var(--eid-shell-footer-offset)+1rem)] sm:max-w-2xl sm:px-6 sm:py-4 sm:pb-[calc(var(--eid-shell-footer-offset)+1rem)]">
      <ConexoesStrip peers={conexoes} />

      <section className="mt-6 md:mt-10">
        <h2 className="text-[10px] font-black uppercase tracking-[0.16em] text-eid-primary-500">Jogos agendados</h2>
        <p className="mt-1 hidden text-xs text-eid-text-secondary md:block">
          Ajuste <strong className="text-eid-fg">data e local</strong> aqui. Lançamento e confirmação de placar ficam no{" "}
          <Link href="/comunidade#resultados-partida" className="font-bold text-eid-primary-300 hover:underline">
            Painel de controle
          </Link>
          .
        </p>
        {(partidasAgendadas ?? []).length === 0 ? (
          <div className="eid-list-item mt-4 rounded-[22px] border-2 border-dashed bg-eid-card/40 py-10 text-center">
            <p className="text-sm font-bold text-eid-fg">Nenhuma pendência</p>
            <p className="mt-1 text-xs text-eid-text-secondary">Sua agenda está em dia. Combine um desafio no radar.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {(partidasAgendadas ?? []).map((row) => {
              const esp = firstOfRelation(row.esportes);
              const pr = row as AgendaPartidaCardRow;
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

      <AgendaAceitosCancelaveis items={aceitosItems} />

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
        Pedidos recebidos para aceitar estão no{" "}
        <Link href="/comunidade" className="font-bold text-eid-primary-300 hover:underline">
          Painel de controle
        </Link>
        . Resultados e placares:{" "}
        <Link href="/comunidade#resultados-partida" className="font-bold text-eid-primary-300 hover:underline">
          Partidas e resultados
        </Link>
        .
      </p>
    </main>
  );
}
