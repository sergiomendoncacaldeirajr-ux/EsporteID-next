import Link from "next/link";
import { vincularLocalProfessorAction } from "@/app/professor/actions";
import { locaisFormPanelClass, locaisPageLeadClass, locaisSectionTitleClass } from "@/components/locais/locais-ui-tokens";
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
      <form action={vincularLocalProfessorAction} className={locaisFormPanelClass}>
        <p className={locaisSectionTitleClass}>Professor · locais</p>
        <h2 className="mt-1 text-lg font-black tracking-tight text-eid-fg sm:text-xl">Vincular local</h2>
        <p className={`${locaisPageLeadClass} mt-2`}>
          Vincule um espaço já existente para reaproveitar disponibilidade e centralizar aulas naquele local.
        </p>
        <div className="mt-4 grid gap-3">
          <select name="espaco_id" className="eid-input-dark rounded-xl px-3 py-2.5 text-sm text-eid-fg">
            {(locaisDisponiveis ?? []).map((local) => (
              <option key={local.id} value={local.id}>
                {local.nome_publico} {local.localizacao ? `· ${local.localizacao}` : ""}
              </option>
            ))}
          </select>
          <select name="tipo_vinculo" defaultValue="preferencial" className="eid-input-dark rounded-xl px-3 py-2.5 text-sm text-eid-fg">
            <option value="preferencial">Preferencial</option>
            <option value="parceiro">Parceiro</option>
            <option value="proprio">Próprio</option>
          </select>
          <label className="flex items-center gap-2.5 text-sm text-eid-fg">
            <input type="checkbox" name="usa_horarios_do_espaco" className="rounded border-[color:var(--eid-border-subtle)]" />
            Usar grade de horários do espaço nas minhas aulas
          </label>
          <textarea
            name="observacoes"
            rows={3}
            placeholder="Observações"
            className="eid-input-dark rounded-xl px-3 py-2.5 text-sm text-eid-fg placeholder:text-eid-text-secondary"
          />
          <button type="submit" className="eid-btn-primary min-h-[44px] rounded-xl px-5 py-3 text-sm font-bold">
            Vincular local
          </button>
        </div>
      </form>

      <section className={locaisFormPanelClass}>
        <p className={locaisSectionTitleClass}>Seus vínculos</p>
        <h2 className="mt-1 text-lg font-black tracking-tight text-eid-fg sm:text-xl">Locais vinculados</h2>
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
                        <Link
                          href={`/local/${espaco.id}`}
                          className="mt-2 inline-flex text-xs font-bold text-eid-primary-300 underline-offset-2 hover:underline"
                        >
                          Abrir página do local
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="rounded-xl border border-dashed border-[color:var(--eid-border-subtle)] bg-eid-surface/35 px-3 py-6 text-center text-sm text-eid-text-secondary">
              Nenhum local vinculado ainda.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
