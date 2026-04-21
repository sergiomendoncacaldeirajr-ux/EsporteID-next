import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revogarTorneioStaff } from "@/app/torneios/actions";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { PerfilBackLink } from "@/components/perfil/perfil-back-link";
import { TorneioInscricoesManager } from "@/components/torneios/torneio-inscricoes-manager";
import { TorneioJogoScoreForm } from "@/components/torneios/torneio-jogo-score-form";
import { TorneioStaffForm } from "@/components/torneios/torneio-staff-form";
import { createClient } from "@/lib/supabase/server";
import { canManageTorneioStaff, canLaunchTorneioScore, getTorneioStaffAccess } from "@/lib/torneios/staff";

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ from?: string }>;
};

export const metadata = {
  title: "Operação do torneio",
};

export default async function TorneioOperacaoPage({ params, searchParams }: Props) {
  const { id: raw } = await params;
  const torneioId = Number(raw);
  if (!Number.isFinite(torneioId) || torneioId < 1) notFound();

  const sp = (await searchParams) ?? {};
  const backHref =
    typeof sp.from === "string" && sp.from.startsWith("/") ? sp.from : `/torneios/${torneioId}`;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/torneios/${torneioId}/operacao`);

  const access = await getTorneioStaffAccess(supabase, torneioId, user.id);
  if (!canLaunchTorneioScore(access)) redirect(`/torneios/${torneioId}`);

  const [{ data: torneio }, { data: jogos }, { data: staffRows }, { data: inscricoesRows }] = await Promise.all([
    supabase.from("torneios").select("id, nome, criador_id").eq("id", torneioId).maybeSingle(),
    supabase
      .from("torneio_jogos")
      .select("id, rodada, idx_rodada, jogador_a_id, jogador_b_id, vencedor_id, status, placar_json, quadra, horario_inicio, observacoes")
      .eq("torneio_id", torneioId)
      .order("rodada", { ascending: true })
      .order("idx_rodada", { ascending: true }),
    supabase
      .from("torneio_staff")
      .select("id, usuario_id, convite_email, papel, status, observacoes, aceito_em")
      .eq("torneio_id", torneioId)
      .order("id", { ascending: false }),
    supabase
      .from("torneio_inscricoes")
      .select("id, usuario_id, dupla_id, time_id, tipo_inscricao, status_inscricao, payment_status, pagante_usuario_id")
      .eq("torneio_id", torneioId)
      .order("id", { ascending: false }),
  ]);

  if (!torneio) notFound();

  const profileIds = [
    ...new Set(
      [...(jogos ?? []).flatMap((jogo) => [jogo.jogador_a_id, jogo.jogador_b_id]), ...(staffRows ?? []).map((row) => row.usuario_id)]
        .concat((inscricoesRows ?? []).flatMap((row) => [row.usuario_id, row.pagante_usuario_id]))
        .filter(Boolean)
        .map(String)
    ),
  ];
  const { data: profiles } = profileIds.length
    ? await supabase.from("profiles").select("id, nome").in("id", profileIds)
    : { data: [] };
  const profileMap = new Map((profiles ?? []).map((profile) => [String(profile.id), profile.nome ?? "Perfil"]));
  const duplaIds = [...new Set((inscricoesRows ?? []).map((row) => Number(row.dupla_id)).filter(Number.isFinite))];
  const timeIds = [...new Set((inscricoesRows ?? []).map((row) => Number(row.time_id)).filter(Number.isFinite))];
  const [{ data: duplas }, { data: times }] = await Promise.all([
    duplaIds.length
      ? supabase.from("duplas").select("id, player1_id, player2_id").in("id", duplaIds)
      : Promise.resolve({ data: [] }),
    timeIds.length ? supabase.from("times").select("id, nome").in("id", timeIds) : Promise.resolve({ data: [] }),
  ]);
  const duplaMap = new Map((duplas ?? []).map((d) => [Number(d.id), d]));
  const timeMap = new Map((times ?? []).map((t) => [Number(t.id), t]));

  return (
    <>
      <DashboardTopbar />
      <main className="mx-auto w-full max-w-5xl px-3 pb-10 pt-3 sm:px-6 sm:pb-12 sm:pt-4">
        <PerfilBackLink href={backHref} label="Voltar" />

        <section className="mt-4 rounded-3xl border border-eid-action-500/25 bg-gradient-to-br from-eid-card via-eid-card to-eid-action-500/10 p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-eid-action-400">
            {access.isOrganizer ? "Operação do organizador" : "Operação do lançador"}
          </p>
          <h1 className="mt-2 text-2xl font-black text-eid-fg">Placar e staff</h1>
          <p className="mt-2 text-sm text-eid-text-secondary">{torneio.nome}</p>
          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            <Link href={`/torneios/${torneioId}`} className="font-semibold text-eid-primary-300 hover:underline">
              Página pública
            </Link>
            <Link href={`/torneios/${torneioId}/chave`} className="font-semibold text-eid-primary-300 hover:underline">
              Chave
            </Link>
            {access.isOrganizer ? (
              <Link href={`/conta/torneio/${torneioId}`} className="font-semibold text-eid-action-400 hover:underline">
                Editar torneio
              </Link>
            ) : null}
          </div>
        </section>

        {canManageTorneioStaff(access) ? (
          <section className="mt-5 grid gap-4 lg:grid-cols-[1.15fr,0.85fr]">
            <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4">
              <h2 className="text-sm font-bold text-eid-fg">Staff atual</h2>
              <div className="mt-4 space-y-3">
                {(staffRows ?? []).map((row) => (
                  <div key={row.id} className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-bg/40 p-3">
                    <p className="text-sm font-semibold text-eid-fg">
                      {row.usuario_id ? profileMap.get(String(row.usuario_id)) ?? row.convite_email ?? "Staff" : row.convite_email ?? "Convite pendente"}
                    </p>
                    <p className="mt-1 text-[11px] text-eid-text-secondary">
                      {row.papel} · {row.status}
                      {row.aceito_em ? ` · ativo desde ${new Date(row.aceito_em).toLocaleDateString("pt-BR")}` : ""}
                    </p>
                    {row.observacoes ? <p className="mt-1 text-[11px] text-eid-text-secondary">{row.observacoes}</p> : null}
                    {row.status !== "revogado" ? (
                      <form action={revogarTorneioStaff} className="mt-3">
                        <input type="hidden" name="staff_id" value={row.id} />
                        <input type="hidden" name="torneio_id" value={torneioId} />
                        <button type="submit" className="text-[11px] font-bold text-red-300 hover:underline">
                          Revogar acesso
                        </button>
                      </form>
                    ) : null}
                  </div>
                ))}
                {(staffRows ?? []).length === 0 ? (
                  <p className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-bg/40 p-4 text-sm text-eid-text-secondary">
                    Nenhum staff cadastrado ainda.
                  </p>
                ) : null}
              </div>
            </div>
            <TorneioStaffForm torneioId={torneioId} />
          </section>
        ) : null}

        {canManageTorneioStaff(access) ? (
          <section className="mt-5 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4">
            <h2 className="text-sm font-bold text-eid-fg">Gestão de inscrições e pagamento</h2>
            <p className="mt-1 text-xs text-eid-text-secondary">
              O organizador pode confirmar/cancelar inscrições, processar estorno no Asaas e substituir atleta (novo pagamento).
            </p>
            <div className="mt-4 grid gap-3">
              {(inscricoesRows ?? []).map((inscricao) => {
                const tipo = String(inscricao.tipo_inscricao ?? "atleta");
                const label =
                  tipo === "dupla"
                    ? (() => {
                        const d = duplaMap.get(Number(inscricao.dupla_id));
                        if (!d) return `Dupla #${inscricao.dupla_id}`;
                        const p1 = profileMap.get(String(d.player1_id)) ?? "Atleta 1";
                        const p2 = profileMap.get(String(d.player2_id)) ?? "Atleta 2";
                        return `${p1} / ${p2}`;
                      })()
                    : tipo === "time"
                      ? (timeMap.get(Number(inscricao.time_id))?.nome ?? `Time #${inscricao.time_id}`)
                      : (profileMap.get(String(inscricao.usuario_id)) ?? `Atleta ${inscricao.usuario_id}`);
                return (
                  <TorneioInscricoesManager
                    key={inscricao.id}
                    torneioId={torneioId}
                    inscricao={{
                      id: inscricao.id,
                      label,
                      tipo,
                      status: String(inscricao.status_inscricao ?? "pendente"),
                      paymentStatus: String(inscricao.payment_status ?? "pending"),
                      pagante: profileMap.get(String(inscricao.pagante_usuario_id)) ?? String(inscricao.pagante_usuario_id ?? "n/a"),
                    }}
                  />
                );
              })}
              {(inscricoesRows ?? []).length === 0 ? (
                <p className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-bg/40 p-4 text-sm text-eid-text-secondary">
                  Nenhuma inscrição registrada no torneio.
                </p>
              ) : null}
            </div>
          </section>
        ) : null}

        <section className="mt-5 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-eid-fg">Jogos e súmulas</h2>
              <p className="mt-1 text-xs text-eid-text-secondary">
                O staff convidado só precisa desta tela para atualizar quadra, horário e placar.
              </p>
            </div>
          </div>
          {(jogos ?? []).length === 0 ? (
            <p className="mt-4 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-bg/40 p-4 text-sm text-eid-text-secondary">
              Ainda não há jogos publicados para este torneio.
            </p>
          ) : (
            <div className="mt-4 grid gap-4">
              {(jogos ?? []).map((jogo) => (
                <div key={jogo.id} className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-bg/40 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-eid-fg">
                        Rodada {jogo.rodada} · Jogo {jogo.idx_rodada}
                      </p>
                      <p className="mt-1 text-[11px] text-eid-text-secondary">
                        {jogo.jogador_a_id ? profileMap.get(String(jogo.jogador_a_id)) ?? "Lado A" : "Lado A"} x{" "}
                        {jogo.jogador_b_id ? profileMap.get(String(jogo.jogador_b_id)) ?? "Lado B" : "Lado B"}
                      </p>
                    </div>
                    <span className="rounded-full border border-eid-primary-500/35 bg-eid-primary-500/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-eid-primary-300">
                      {jogo.status ?? "pendente"}
                    </span>
                  </div>
                  <TorneioJogoScoreForm
                    torneioId={torneioId}
                    jogo={{
                      id: jogo.id,
                      status: jogo.status,
                      quadra: jogo.quadra,
                      horario_inicio: jogo.horario_inicio,
                      observacoes: jogo.observacoes,
                      placar_json: jogo.placar_json,
                      jogador_a_id: jogo.jogador_a_id,
                      jogador_b_id: jogo.jogador_b_id,
                      vencedor_id: jogo.vencedor_id,
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
