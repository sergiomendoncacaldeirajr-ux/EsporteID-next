import { adminMediarResultadoDaDenuncia, adminSetDenunciaStatus } from "@/app/admin/actions";
import { AdminDenunciaStatusSubmitButton } from "@/app/admin/denuncias/status-submit-button";
import { EidCancelAction } from "@/components/ui/eid-cancel-action";
import { createServiceRoleClient, hasServiceRoleConfig } from "@/lib/supabase/service-role";

const ST = ["aberta", "em_analise", "resolvida", "arquivada"];

type DenunciaRow = {
  id: number;
  motivo: string;
  texto: string | null;
  status: string | null;
  codigo_motivo: string | null;
  alvo_usuario_id: string | null;
  alvo_tipo: string;
  alvo_id: number | null;
  denunciante_id: string;
  criado_em: string;
};

function whatsappHref(raw: string | null | undefined): string | null {
  const digits = String(raw ?? "").replace(/\D+/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}`;
}

function inferPartidaIdFromDenuncia(d: DenunciaRow): number | null {
  const txt = `${String(d.texto ?? "")} ${String(d.motivo ?? "")}`;
  const m = txt.match(/partida\s*#\s*(\d+)/i);
  if (!m?.[1]) return null;
  const id = Number(m[1]);
  return Number.isFinite(id) && id > 0 ? id : null;
}

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminDenunciasPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const flash = typeof sp.adm_flash === "string" ? sp.adm_flash : "";
  if (!hasServiceRoleConfig()) {
    return <p className="text-sm text-eid-text-secondary">Configure a service role.</p>;
  }
  const db = createServiceRoleClient();
  const { data, error } = await db
    .from("denuncias")
    .select("id, motivo, texto, status, codigo_motivo, alvo_usuario_id, alvo_tipo, alvo_id, denunciante_id, criado_em")
    .order("id", { ascending: false })
    .limit(200);
  if (error) return <p className="text-sm text-red-300">{error.message}</p>;

  const rows = (data ?? []) as DenunciaRow[];
  const alvoIds = [...new Set(rows.map((r) => r.alvo_usuario_id).filter(Boolean))] as string[];
  const denIds = [...new Set(rows.map((r) => r.denunciante_id).filter(Boolean))];

  const nomePorId = new Map<string, string>();
  const whatsappPorId = new Map<string, string | null>();
  if (alvoIds.length) {
    const { data: perfisAlvo } = await db.from("profiles").select("id, nome, whatsapp").in("id", alvoIds);
    for (const p of perfisAlvo ?? []) {
      if (p.id) {
        nomePorId.set(String(p.id), String(p.nome ?? ""));
        whatsappPorId.set(String(p.id), p.whatsapp ?? null);
      }
    }
  }
  const faltamDen = denIds.filter((id) => !nomePorId.has(id));
  if (faltamDen.length) {
    const { data: perfisDen } = await db.from("profiles").select("id, nome, whatsapp").in("id", faltamDen);
    for (const p of perfisDen ?? []) {
      if (p.id) {
        nomePorId.set(String(p.id), String(p.nome ?? ""));
        whatsappPorId.set(String(p.id), p.whatsapp ?? null);
      }
    }
  }

  return (
    <div>
      <h2 className="text-base font-bold text-eid-fg">Denúncias</h2>
      <p className="mt-1 text-sm text-eid-text-secondary">Últimas 200. Novas denúncias também geram alertas na visão geral do admin.</p>
      {flash === "mediacao_ok" ? (
        <p className="mt-3 rounded-lg border border-emerald-500/35 bg-emerald-500/12 px-3 py-2 text-xs font-semibold text-[color:color-mix(in_srgb,var(--eid-success-600)_80%,var(--eid-fg)_20%)]">
          Mediação aplicada com sucesso e denúncia marcada como resolvida.
        </p>
      ) : null}
      {flash === "mediacao_invalida" || flash === "mediacao_erro" ? (
        <p className="mt-3 rounded-lg border border-rose-500/35 bg-rose-500/12 px-3 py-2 text-xs font-semibold text-[color:color-mix(in_srgb,var(--eid-danger-600)_82%,var(--eid-fg)_18%)]">
          Não foi possível aplicar a mediação nesta denúncia.
        </p>
      ) : null}
      {flash === "denuncia_status_ok" ? (
        <p className="mt-3 rounded-lg border border-emerald-500/35 bg-emerald-500/12 px-3 py-2 text-xs font-semibold text-[color:color-mix(in_srgb,var(--eid-success-600)_80%,var(--eid-fg)_20%)]">
          Status da denúncia salvo com sucesso.
        </p>
      ) : null}
      {flash === "denuncia_status_invalido" || flash === "denuncia_status_erro" ? (
        <p className="mt-3 rounded-lg border border-rose-500/35 bg-rose-500/12 px-3 py-2 text-xs font-semibold text-[color:color-mix(in_srgb,var(--eid-danger-600)_82%,var(--eid-fg)_18%)]">
          Não foi possível salvar o status da denúncia. Tente novamente.
        </p>
      ) : null}
      <div className="mt-4 space-y-3">
        {rows.map((d) => {
          const partidaIdMediacao = inferPartidaIdFromDenuncia(d);
          const alvoNome = d.alvo_usuario_id ? nomePorId.get(d.alvo_usuario_id) : null;
          const denNome = nomePorId.get(d.denunciante_id);
          const alvoWa = d.alvo_usuario_id ? whatsappHref(whatsappPorId.get(d.alvo_usuario_id)) : null;
          const denWa = whatsappHref(whatsappPorId.get(d.denunciante_id));
          return (
            <div key={d.id} className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-xs font-mono text-eid-text-secondary">#{d.id}</p>
                <form action={adminSetDenunciaStatus} className="flex items-center gap-1">
                  <input type="hidden" name="id" value={d.id} />
                  <select name="status" defaultValue={d.status ?? "aberta"} className="eid-input-dark rounded-lg px-2 py-1 text-[11px]">
                    {ST.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <AdminDenunciaStatusSubmitButton />
                </form>
              </div>
              {d.codigo_motivo ? (
                <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-eid-text-secondary">Código: {d.codigo_motivo}</p>
              ) : null}
              <p className="mt-1 text-sm font-semibold text-eid-fg">{d.motivo}</p>
              {d.texto ? <p className="mt-1 text-sm text-eid-text-secondary">{d.texto}</p> : null}
              <p className="mt-2 text-[11px] text-eid-text-secondary">
                Criada em {new Date(d.criado_em).toLocaleString("pt-BR")}
              </p>
              <p className="mt-1 text-[11px] text-eid-text-secondary">
                Alvo ({d.alvo_tipo}
                {d.alvo_id != null ? ` #${d.alvo_id}` : ""}):{" "}
                {d.alvo_usuario_id ? (
                  <>
                    <a href={`/perfil/${d.alvo_usuario_id}`} className="font-semibold text-eid-primary-300">
                      {alvoNome ?? d.alvo_usuario_id}
                    </a>
                    <span className="font-mono text-eid-text-secondary"> · {d.alvo_usuario_id}</span>
                  </>
                ) : (
                  "—"
                )}
              </p>
              <p className="mt-1 text-[11px] text-eid-text-secondary">
                Denunciante:{" "}
                <span className="font-semibold text-eid-fg">{denNome ?? "—"}</span>
                <span className="font-mono"> · {d.denunciante_id}</span>
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {partidaIdMediacao ? (
                  <>
                    <form action={adminMediarResultadoDaDenuncia}>
                      <input type="hidden" name="denuncia_id" value={d.id} />
                      <input type="hidden" name="partida_id" value={partidaIdMediacao} />
                      <input type="hidden" name="decision" value="winner_1" />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1 rounded-lg border border-eid-primary-500/45 bg-eid-primary-500/12 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.05em] text-eid-primary-200"
                      >
                        Definir vencedor: lado 1
                      </button>
                    </form>
                    <form action={adminMediarResultadoDaDenuncia}>
                      <input type="hidden" name="denuncia_id" value={d.id} />
                      <input type="hidden" name="partida_id" value={partidaIdMediacao} />
                      <input type="hidden" name="decision" value="winner_2" />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1 rounded-lg border border-eid-primary-500/45 bg-eid-primary-500/12 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.05em] text-eid-primary-200"
                      >
                        Definir vencedor: lado 2
                      </button>
                    </form>
                    <form action={adminMediarResultadoDaDenuncia}>
                      <input type="hidden" name="denuncia_id" value={d.id} />
                      <input type="hidden" name="partida_id" value={partidaIdMediacao} />
                      <input type="hidden" name="decision" value="cancel" />
                      <EidCancelAction label="Cancelar partida na mediação" compact className="rounded-lg" />
                    </form>
                  </>
                ) : null}
                {alvoWa ? (
                  <a
                    href={alvoWa}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/45 bg-emerald-500/12 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.05em] text-emerald-200"
                  >
                    <span aria-hidden>💬</span>
                    WhatsApp do alvo
                  </a>
                ) : null}
                {denWa ? (
                  <a
                    href={denWa}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-eid-primary-500/45 bg-eid-primary-500/12 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.05em] text-eid-primary-200"
                  >
                    <span aria-hidden>💬</span>
                    WhatsApp do denunciante
                  </a>
                ) : null}
                {!alvoWa && !denWa ? (
                  <span className="text-[10px] text-eid-text-secondary">Nenhum WhatsApp disponível para contato rápido.</span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
