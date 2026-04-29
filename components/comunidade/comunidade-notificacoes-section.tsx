import Link from "next/link";
import { marcarNotificacaoLida, marcarTodasNotificacoesLidas } from "@/app/comunidade/actions";
import { EidNotificacaoRow } from "@/components/ui/eid-notificacao-row";

export type NotifRow = {
  id: number;
  mensagem: string;
  tipo: string | null;
  lida: boolean;
  criada_em: string | null;
  data_criacao: string | null;
};

function isFlowActionNotif(tipoRaw: string | null | undefined): boolean {
  const tipo = String(tipoRaw ?? "")
    .trim()
    .toLowerCase();
  return tipo === "match" || tipo === "desafio";
}

function notifDate(n: NotifRow) {
  const raw = n.data_criacao ?? n.criada_em;
  if (!raw) return "";
  try {
    return new Date(raw).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "";
  }
}

export function ComunidadeNotificacoesSection({ items }: { items: NotifRow[] }) {
  const unread = items.filter((n) => n.lida !== true && !isFlowActionNotif(n.tipo)).length;

  return (
    <section
      id="notificacoes"
      className="scroll-mt-24 overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_95%,transparent),color-mix(in_srgb,var(--eid-surface)_92%,transparent))] p-3 md:p-4"
    >
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[color:var(--eid-border-subtle)] pb-3">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-eid-primary-500">Notificações</h2>
          <p className="mt-1 text-sm text-eid-text-secondary">
            Avisos gerais, respostas e lembretes em um só lugar.
          </p>
        </div>
        {unread > 0 ? (
          <form action={marcarTodasNotificacoesLidas}>
            <button
              type="submit"
              data-eid-compact-chip-btn="true"
              className="rounded-lg border border-eid-primary-500/40 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-eid-primary-300 transition hover:bg-eid-primary-500/10"
            >
              Marcar todas lidas ({unread})
            </button>
          </form>
        ) : null}
      </div>

      {items.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-[color:var(--eid-border-subtle)] bg-eid-card/50 p-6 text-center text-sm text-eid-text-secondary">
          Nenhuma notificação ainda. Novos avisos aparecem aqui automaticamente.
        </p>
      ) : (
        <ul className="mt-4 list-none space-y-2 p-0">
          {items.map((n) => (
            <li key={n.id}>
              <EidNotificacaoRow unread={n.lida !== true}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {n.tipo ? (
                      <span className="inline-block rounded-full border border-eid-primary-500/30 px-2 py-0.5 text-[10px] font-extrabold uppercase text-eid-primary-300">
                        {String(n.tipo).trim().toLowerCase() === "match" ? "desafio" : n.tipo}
                      </span>
                    ) : null}
                    <p
                      className={`mt-2 text-sm leading-relaxed ${n.lida === true ? "text-eid-text-secondary" : "text-eid-fg"}`}
                    >
                      {n.mensagem}
                    </p>
                    {notifDate(n) ? (
                      <p className="mt-2 text-[11px] text-eid-text-secondary">{notifDate(n)}</p>
                    ) : null}
                  </div>
                  {n.lida !== true ? (
                    <form action={marcarNotificacaoLida} className="shrink-0">
                      <input type="hidden" name="notif_id" value={String(n.id)} />
                      <button
                        type="submit"
                        data-eid-compact-chip-btn="true"
                        className="rounded-lg border border-[color:var(--eid-border-subtle)] px-3 py-1.5 text-[11px] font-semibold text-eid-text-secondary transition hover:border-eid-primary-500/40 hover:text-eid-fg"
                      >
                        Lida
                      </button>
                    </form>
                  ) : null}
                </div>
              </EidNotificacaoRow>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-center text-[11px] text-eid-text-secondary">
        Pedidos para aceitar estão na seção &quot;Desafio&quot; abaixo.{" "}
        <Link href="/agenda" className="font-semibold text-eid-primary-300 hover:underline">
          Agenda
        </Link>{" "}
        (data e local) ·{" "}
        <Link href="/comunidade#resultados-partida" className="font-semibold text-eid-primary-300 hover:underline">
          Partidas e resultados
        </Link>
        .
      </p>
    </section>
  );
}
