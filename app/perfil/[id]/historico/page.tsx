import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { loginNextWithOptionalFrom } from "@/lib/auth/login-next-path";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ from?: string }>;
};

const HISTORICO_STATUS_CONCLUIDO = new Set(["concluida", "concluído", "finalizada", "encerrada"]);

export default async function PerfilHistoricoCompletoPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = (await searchParams) ?? {};

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(loginNextWithOptionalFrom(`/perfil/${id}/historico`, sp));

  const { data: perfil } = await supabase
    .from("profiles")
    .select("id, nome, mostrar_historico_publico")
    .eq("id", id)
    .maybeSingle();
  if (!perfil) notFound();
  const isSelf = user.id === id;
  if (!isSelf && perfil.mostrar_historico_publico === false) {
    redirect(`/perfil/${id}`);
  }

  const { data: partidasRaw } = await supabase
    .from("partidas")
    .select(
      "id, jogador1_id, jogador2_id, time1_id, time2_id, placar_1, placar_2, status, torneio_id, data_resultado, data_registro"
    )
    .or(`jogador1_id.eq.${id},jogador2_id.eq.${id}`)
    .order("data_registro", { ascending: false })
    .limit(300);

  const partidas = (partidasRaw ?? []).filter((p) => {
    if (!p.jogador1_id || !p.jogador2_id) return false;
    if (p.time1_id != null || p.time2_id != null) return false;
    const st = String(p.status ?? "").toLowerCase();
    return HISTORICO_STATUS_CONCLUIDO.has(st);
  });

  const oponenteIds = [
    ...new Set(partidas.map((p) => (p.jogador1_id === id ? p.jogador2_id : p.jogador1_id)).filter((x): x is string => !!x)),
  ];
  const nomeOponente = new Map<string, string>();
  if (oponenteIds.length > 0) {
    const { data: oponentes } = await supabase.from("profiles").select("id, nome").in("id", oponenteIds);
    for (const op of oponentes ?? []) {
      if (op.id) nomeOponente.set(op.id, op.nome ?? "Atleta");
    }
  }

  const totais = partidas.reduce(
    (acc, p) => {
      const isP1 = p.jogador1_id === id;
      const s1 = Number(p.placar_1 ?? 0);
      const s2 = Number(p.placar_2 ?? 0);
      if (s1 === s2) acc.empates += 1;
      else if ((isP1 && s1 > s2) || (!isP1 && s2 > s1)) acc.vitorias += 1;
      else acc.derrotas += 1;
      if (p.torneio_id) acc.torneio += 1;
      else acc.rank += 1;
      return acc;
    },
    { vitorias: 0, derrotas: 0, empates: 0, rank: 0, torneio: 0 }
  );

  return (
    <>
      <DashboardTopbar />
      <main className="mx-auto w-full max-w-lg px-2.5 pb-6 pt-2 sm:max-w-2xl sm:px-5 sm:pb-8 sm:pt-3">
        <div className="eid-surface-panel rounded-2xl p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-sm font-black uppercase tracking-[0.08em] text-eid-fg">Histórico completo</h1>
            <Link
              href={`/perfil/${id}`}
              className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary transition-colors hover:text-eid-fg"
            >
              Voltar ao perfil
            </Link>
          </div>
          <p className="mt-0.5 text-[10px] text-eid-text-secondary">{perfil.nome ?? "Atleta"} · somente confrontos individuais</p>

          <div className="mt-3 grid grid-cols-5 gap-1.5">
            <div className="eid-list-item rounded-lg bg-eid-surface/45 px-1.5 py-1 text-center">
              <p className="text-[12px] font-black text-emerald-300">{totais.vitorias}</p>
              <p className="text-[8px] font-semibold uppercase text-eid-text-secondary">V</p>
            </div>
            <div className="eid-list-item rounded-lg bg-eid-surface/45 px-1.5 py-1 text-center">
              <p className="text-[12px] font-black text-red-300">{totais.derrotas}</p>
              <p className="text-[8px] font-semibold uppercase text-eid-text-secondary">D</p>
            </div>
            <div className="eid-list-item rounded-lg bg-eid-surface/45 px-1.5 py-1 text-center">
              <p className="text-[12px] font-black text-eid-primary-300">{totais.empates}</p>
              <p className="text-[8px] font-semibold uppercase text-eid-text-secondary">E</p>
            </div>
            <div className="eid-list-item rounded-lg bg-eid-surface/45 px-1.5 py-1 text-center">
              <p className="text-[12px] font-black text-eid-fg">{totais.rank}</p>
              <p className="text-[8px] font-semibold uppercase text-eid-text-secondary">Rank</p>
            </div>
            <div className="eid-list-item rounded-lg bg-eid-surface/45 px-1.5 py-1 text-center">
              <p className="text-[12px] font-black text-eid-fg">{totais.torneio}</p>
              <p className="text-[8px] font-semibold uppercase text-eid-text-secondary">Torneio</p>
            </div>
          </div>

          {partidas.length > 0 ? (
            <ul className="mt-3 grid gap-1.5">
              {partidas.map((p) => {
                const isP1 = p.jogador1_id === id;
                const s1 = Number(p.placar_1 ?? 0);
                const s2 = Number(p.placar_2 ?? 0);
                const empatou = s1 === s2;
                const venceu = isP1 ? s1 > s2 : s2 > s1;
                const resultado = empatou ? "E" : venceu ? "V" : "D";
                const oponenteId = isP1 ? p.jogador2_id : p.jogador1_id;
                const oponenteNome = oponenteId ? nomeOponente.get(oponenteId) ?? "Atleta" : "Atleta";
                const data = p.data_resultado ?? p.data_registro;
                return (
                  <li
                    key={p.id}
                    className={`eid-list-item flex items-center justify-between rounded-lg bg-eid-surface/45 px-2 py-1.5 text-[10px] ${
                      resultado === "V"
                        ? "border-emerald-400/30"
                        : resultado === "D"
                          ? "border-red-400/30"
                          : "border-[color:var(--eid-border-subtle)]"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[10px] font-semibold text-eid-fg">
                        {p.torneio_id ? "Torneio" : "Rank"} · vs {oponenteNome}
                      </p>
                      <p className="text-[9px] text-eid-text-secondary">
                        {s1}x{s2} · {data ? new Date(data).toLocaleDateString("pt-BR") : "—"}
                      </p>
                    </div>
                    <span className="ml-2 text-[12px] font-black text-eid-fg">{resultado}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="eid-list-item mt-3 flex min-h-[110px] flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-eid-primary-500/35 bg-eid-primary-500/[0.06] p-4 text-center">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-eid-primary-500/35 bg-eid-surface/65 text-eid-primary-300">
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden>
                  <path d="M10 2.25a.75.75 0 0 1 .75.75V10h4.25a.75.75 0 0 1 0 1.5H10A.75.75 0 0 1 9.25 10V3a.75.75 0 0 1 .75-.75Zm0 15a7.25 7.25 0 1 0 0-14.5 7.25 7.25 0 0 0 0 14.5ZM1.25 10a8.75 8.75 0 1 1 17.5 0 8.75 8.75 0 0 1-17.5 0Z" />
                </svg>
              </span>
              <p className="text-[12px] font-bold text-eid-fg">Nenhum histórico encontrado</p>
              <p className="text-[10px] text-eid-text-secondary">
                Ainda não há partidas individuais concluídas de rank ou torneio para este perfil.
              </p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

