import Link from "next/link";
import { vincularLocalProfessorAction } from "@/app/professor/actions";
import { requireProfessorUser } from "@/lib/professor/server";

export default async function ProfessorLocaisPage() {
  const { supabase, user } = await requireProfessorUser("/professor/locais");

  const [{ data: locaisDisponiveis }, { data: vinculados }] = await Promise.all([
    supabase
      .from("espacos_genericos")
      .select("id, nome_publico, localizacao")
      .eq("ativo_listagem", true)
      .order("id", { ascending: false })
      .limit(50),
    supabase
      .from("professor_locais")
      .select("id, tipo_vinculo, usa_horarios_do_espaco, status_vinculo, observacoes, espacos_genericos(id, nome_publico, localizacao)")
      .eq("professor_id", user.id)
      .order("id", { ascending: false }),
  ]);

  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <form action={vincularLocalProfessorAction} className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
        <h2 className="text-lg font-bold text-eid-fg">Vincular local</h2>
        <p className="mt-2 text-sm text-eid-text-secondary">
          Vincule um espaço já existente para reaproveitar disponibilidade e centralizar aulas naquele local.
        </p>
        <div className="mt-4 grid gap-3">
          <select name="espaco_id" className="eid-input-dark rounded-xl px-3 py-2 text-sm">
            {(locaisDisponiveis ?? []).map((local) => (
              <option key={local.id} value={local.id}>
                {local.nome_publico} {local.localizacao ? `· ${local.localizacao}` : ""}
              </option>
            ))}
          </select>
          <select name="tipo_vinculo" defaultValue="preferencial" className="eid-input-dark rounded-xl px-3 py-2 text-sm">
            <option value="preferencial">Preferencial</option>
            <option value="parceiro">Parceiro</option>
            <option value="proprio">Próprio</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-eid-fg">
            <input type="checkbox" name="usa_horarios_do_espaco" />
            Usar grade de horários do espaço nas minhas aulas
          </label>
          <textarea name="observacoes" rows={3} placeholder="Observações" className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
          <button className="eid-btn-primary rounded-xl px-5 py-3 text-sm font-bold">
            Vincular local
          </button>
        </div>
      </form>

      <section className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
        <h2 className="text-lg font-bold text-eid-fg">Locais vinculados</h2>
        <div className="mt-4 space-y-3">
          {(vinculados ?? []).length ? (
            (vinculados ?? []).map((item) => {
              const espaco = Array.isArray(item.espacos_genericos) ? item.espacos_genericos[0] : item.espacos_genericos;
              return (
                <div key={item.id} className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-eid-fg">{espaco?.nome_publico ?? "Local"}</p>
                      <p className="mt-1 text-xs text-eid-text-secondary">
                        {espaco?.localizacao ?? "Localização não informada"} · {item.tipo_vinculo} · {item.status_vinculo}
                      </p>
                      {item.observacoes ? (
                        <p className="mt-1 text-xs text-eid-text-secondary">{item.observacoes}</p>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-eid-text-secondary">
                        {item.usa_horarios_do_espaco ? "Usando grade do espaço" : "Agenda livre do professor"}
                      </p>
                      {espaco?.id ? (
                        <Link href={`/local/${espaco.id}`} className="mt-2 inline-flex text-xs font-semibold text-eid-primary-300 underline">
                          Abrir página do local
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-eid-text-secondary">Nenhum local vinculado ainda.</p>
          )}
        </div>
      </section>
    </div>
  );
}
