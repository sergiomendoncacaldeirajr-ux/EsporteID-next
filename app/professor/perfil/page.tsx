import { salvarProfessorPerfilAction } from "@/app/professor/actions";
import {
  descreverPoliticaCancelamentoProfessor,
  parsePoliticaCancelamentoProfessor,
} from "@/lib/professor/cancellation";
import { requireProfessorUser } from "@/lib/professor/server";

export default async function ProfessorPerfilPage() {
  const { supabase, user } = await requireProfessorUser("/professor/perfil");

  const [{ data: perfil }, { data: esportes }] = await Promise.all([
    supabase
      .from("professor_perfil")
      .select(
        "headline, bio_profissional, certificacoes_json, publico_alvo_json, formato_aula_json, politica_cancelamento_json, aceita_novos_alunos, perfil_publicado, whatsapp_visibilidade"
      )
      .eq("usuario_id", user.id)
      .maybeSingle(),
    supabase
      .from("professor_esportes")
      .select("esporte_id, objetivo_plataforma, valor_base_centavos, tipo_atuacao, esportes(nome)")
      .eq("professor_id", user.id)
      .eq("ativo", true)
      .order("id", { ascending: true }),
  ]);

  const principal = esportes?.[0] ?? null;
  const politica = parsePoliticaCancelamentoProfessor(perfil?.politica_cancelamento_json);

  return (
    <section className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
      <h2 className="text-lg font-bold text-eid-fg">Perfil profissional</h2>
      <form action={salvarProfessorPerfilAction} className="mt-4 grid gap-4">
        <input
          type="hidden"
          name="esporte_id"
          value={principal?.esporte_id ?? ""}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-4">
            <label className="block text-sm text-eid-fg">
              Headline
              <input
                name="headline"
                defaultValue={perfil?.headline ?? ""}
                className="eid-input-dark mt-1 w-full rounded-xl px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm text-eid-fg">
              Bio profissional
              <textarea
                name="bio_profissional"
                rows={4}
                defaultValue={perfil?.bio_profissional ?? ""}
                className="eid-input-dark mt-1 w-full rounded-xl px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm text-eid-fg">
              Certificações
              <input
                name="certificacoes"
                defaultValue={Array.isArray(perfil?.certificacoes_json) ? perfil.certificacoes_json.join(", ") : ""}
                placeholder="Ex.: CREF, CBT, Fisiologia do esporte"
                className="eid-input-dark mt-1 w-full rounded-xl px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm text-eid-fg">
              Público-alvo
              <input
                name="publico_alvo"
                defaultValue={Array.isArray(perfil?.publico_alvo_json) ? perfil.publico_alvo_json.join(", ") : ""}
                placeholder="Ex.: iniciantes, infantil, alta performance"
                className="eid-input-dark mt-1 w-full rounded-xl px-3 py-2 text-sm"
              />
            </label>
          </div>

          <div className="space-y-4">
            <label className="block text-sm text-eid-fg">
              Formato de aula
              <input
                name="formato_aula"
                defaultValue={Array.isArray(perfil?.formato_aula_json) ? perfil.formato_aula_json.join(", ") : ""}
                placeholder="Ex.: individual, grupo, online"
                className="eid-input-dark mt-1 w-full rounded-xl px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm text-eid-fg">
              WhatsApp no perfil profissional
              <select
                name="whatsapp_visibilidade"
                defaultValue={perfil?.whatsapp_visibilidade ?? "publico"}
                className="eid-input-dark mt-1 w-full rounded-xl px-3 py-2 text-sm"
              >
                <option value="publico">Público para visitantes</option>
                <option value="alunos_aceitos_ou_com_aula">Só para alunos aceitos ou já vinculados</option>
                <option value="oculto">Oculto no perfil profissional</option>
              </select>
            </label>
            <label className="block text-sm text-eid-fg">
              Política de cancelamento
              <textarea
                name="politica_cancelamento"
                rows={3}
                defaultValue={politica.resumo ?? ""}
                className="eid-input-dark mt-1 w-full rounded-xl px-3 py-2 text-sm"
              />
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block text-sm text-eid-fg">
                Antecedência mínima sem custo (min)
                <input
                  type="number"
                  min={0}
                  name="politica_antecedencia_minutos"
                  defaultValue={politica.antecedenciaMinutos}
                  className="eid-input-dark mt-1 w-full rounded-xl px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm text-eid-fg">
                Retenção percentual fora da janela
                <input
                  type="number"
                  min={0}
                  max={100}
                  name="politica_percentual_retencao"
                  defaultValue={politica.percentualRetencao}
                  className="eid-input-dark mt-1 w-full rounded-xl px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm text-eid-fg">
                Retenção fixa (centavos)
                <input
                  type="number"
                  min={0}
                  name="politica_valor_fixo_centavos"
                  defaultValue={politica.valorFixoCentavos}
                  className="eid-input-dark mt-1 w-full rounded-xl px-3 py-2 text-sm"
                />
              </label>
              <label className="flex items-center gap-2 self-end rounded-xl border border-[color:var(--eid-border-subtle)] px-3 py-2 text-sm text-eid-fg">
                <input
                  type="checkbox"
                  name="politica_cobrar_no_show"
                  defaultChecked={politica.cobrarNoShow}
                />
                Cobrar no-show quando o aluno faltar
              </label>
            </div>
            <p className="rounded-xl border border-[color:var(--eid-border-subtle)] px-3 py-2 text-xs text-eid-text-secondary">
              Resumo atual: {descreverPoliticaCancelamentoProfessor(perfil?.politica_cancelamento_json) || "Sem regra definida."}
            </p>
            {principal ? (
              <>
                <label className="block text-sm text-eid-fg">
                  Objetivo padrão no esporte principal
                  <select
                    name="objetivo_plataforma"
                    defaultValue={principal.objetivo_plataforma ?? "somente_exposicao"}
                    className="eid-input-dark mt-1 w-full rounded-xl px-3 py-2 text-sm"
                  >
                    <option value="somente_exposicao">Somente exposição</option>
                    <option value="gerir_alunos">Gerir alunos</option>
                    <option value="ambos">Exposição + gestão</option>
                  </select>
                </label>
                <label className="block text-sm text-eid-fg">
                  Valor base no esporte principal (centavos)
                  <input
                    type="number"
                    name="valor_base_centavos"
                    min={0}
                    defaultValue={principal.valor_base_centavos ?? 0}
                    className="eid-input-dark mt-1 w-full rounded-xl px-3 py-2 text-sm"
                  />
                </label>
                <fieldset className="rounded-xl border border-[color:var(--eid-border-subtle)] p-3">
                  <legend className="px-2 text-xs font-semibold text-eid-text-secondary">Tipo de atuação</legend>
                  {(["aulas", "treinamento", "consultoria"] as const).map((tipo) => (
                    <label key={tipo} className="mt-2 flex items-center gap-2 text-sm text-eid-fg first:mt-0">
                      <input
                        type="checkbox"
                        name="tipo_atuacao"
                        value={tipo}
                        defaultChecked={(principal.tipo_atuacao ?? ["aulas"]).includes(tipo)}
                      />
                      {tipo}
                    </label>
                  ))}
                </fieldset>
              </>
            ) : null}
            <label className="flex items-center gap-2 text-sm text-eid-fg">
              <input type="checkbox" name="aceita_novos_alunos" defaultChecked={perfil?.aceita_novos_alunos ?? true} />
              Aceitar novos alunos
            </label>
            <label className="flex items-center gap-2 text-sm text-eid-fg">
              <input type="checkbox" name="perfil_publicado" defaultChecked={perfil?.perfil_publicado ?? false} />
              Publicar perfil de professor
            </label>
          </div>
        </div>

        <div>
          <button className="eid-btn-primary rounded-xl px-5 py-3 text-sm font-bold">
            Salvar perfil profissional
          </button>
        </div>
      </form>
    </section>
  );
}
