export type ConviteTimeEnviadoItem = {
  id: number;
  equipeNome: string;
  equipeId: number;
  equipeTipo: string;
  esporteNome: string;
  convidadoNome: string;
  status: string;
  criadoEm: string | null;
  respondidoEm: string | null;
};

function statusLabel(status: string): string {
  const s = String(status ?? "").trim().toLowerCase();
  if (s === "pendente") return "Pendente";
  if (s === "aceito" || s === "aprovado") return "Aceito";
  if (s === "recusado") return "Recusado";
  if (s === "cancelado") return "Cancelado";
  return "Status desconhecido";
}

function statusClass(status: string): string {
  const s = String(status ?? "").trim().toLowerCase();
  if (s === "aceito" || s === "aprovado") return "border-emerald-500/35 bg-emerald-500/12 text-emerald-100";
  if (s === "recusado" || s === "cancelado") return "border-rose-500/35 bg-rose-500/12 text-rose-100";
  return "border-eid-primary-500/35 bg-eid-primary-500/12 text-eid-primary-200";
}

export function ComunidadeConvitesEnviadosTime({ items }: { items: ConviteTimeEnviadoItem[] }) {
  if (!items.length) {
    return (
      <p className="mt-2 rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-card p-3 text-sm text-eid-text-secondary">
        Você ainda não enviou convites de equipe.
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      <ul className="space-y-3">
        {items.map((c) => (
          <li
            key={c.id}
            className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_95%,transparent),color-mix(in_srgb,var(--eid-surface)_92%,transparent))] p-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-eid-fg">{c.convidadoNome}</p>
                <p className="mt-1 text-xs text-eid-text-secondary">
                  Convite para {c.equipeNome} ({(c.equipeTipo ?? "time").toUpperCase()} · {c.esporteNome})
                </p>
                <p className="mt-1 text-[11px] text-eid-text-secondary">
                  Enviado em {c.criadoEm ? new Date(c.criadoEm).toLocaleString("pt-BR") : "—"}
                  {c.respondidoEm ? ` · Respondido em ${new Date(c.respondidoEm).toLocaleString("pt-BR")}` : ""}
                </p>
              </div>
              <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.06em] ${statusClass(c.status)}`}>
                {statusLabel(c.status)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
