import { adminSetSystemFeatureMode } from "@/app/admin/actions";
import { SYSTEM_FEATURE_LABEL, type SystemFeatureKey } from "@/lib/system-features";
import { createServiceRoleClient, hasServiceRoleConfig } from "@/lib/supabase/service-role";

const MODE_HELP: Record<string, { label: string; desc: string }> = {
  ativo: {
    label: "Ligado para todos",
    desc: "Qualquer usuário logado enxerga e usa esta área do app normalmente.",
  },
  em_breve: {
    label: "Em breve (vitrine)",
    desc: "Pode aparecer como “chegando”; uso real ainda limitado ou só teaser.",
  },
  desenvolvimento: {
    label: "Oculto / em construção",
    desc: "A maior parte dos usuários não vê; equipe desenvolve sem pressão de suporte.",
  },
  teste: {
    label: "Só pilotos (lista de IDs)",
    desc: "Somente os perfis cujos IDs você colocar abaixo veem a funcionalidade — ideal para homologação.",
  },
};

export const metadata = {
  title: "Funcionalidades do app",
};

export default async function AdminFuncionalidadesDoAppPage() {
  if (!hasServiceRoleConfig()) {
    return <p className="text-sm text-eid-text-secondary">Configure a service role.</p>;
  }
  const db = createServiceRoleClient();
  const { data: featureModesRow } = await db
    .from("app_config")
    .select("value_json")
    .eq("key", "system_feature_modes_v1")
    .maybeSingle();

  const featureKeys: SystemFeatureKey[] = [
    "marketplace",
    "locais",
    "torneios",
    "professores",
    "organizador_torneios",
  ];
  const rawFeatures =
    featureModesRow?.value_json &&
    typeof featureModesRow.value_json === "object" &&
    !Array.isArray(featureModesRow.value_json)
      ? ((featureModesRow.value_json as { features?: Record<string, unknown> }).features ?? {})
      : {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-eid-fg">Funcionalidades do app</h1>
        <p className="mt-2 max-w-3xl text-sm text-eid-text-secondary">
          Aqui você define <strong className="text-eid-fg">quem enxerga cada grande módulo</strong> do EsporteID — não
          confundir com regras de pontuação de ranking (isso fica em{" "}
          <a className="font-semibold text-eid-primary-300 underline" href="/admin/regras">
            Ranking &amp; desafio
          </a>
          ).
        </p>
        <p className="mt-2 max-w-3xl text-xs text-eid-text-secondary">
          Use <strong className="text-eid-fg">teste</strong> com IDs de perfil (UUID) para liberar só para pilotos; em{" "}
          <a className="text-eid-primary-300 underline" href="/admin/admins">
            Admins
          </a>{" "}
          dá para cadastrar testadores em lote.
        </p>
      </div>

      <section className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/50 p-4">
        <h2 className="text-base font-bold text-eid-fg">Modo por módulo</h2>
        <p className="mt-1 text-sm text-eid-text-secondary">
          Escolha o estado de cada área. Os rótulos abaixo explicam o efeito no app.
        </p>

        <dl className="mt-4 grid gap-2 rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-bg/30 p-3 text-[11px] text-eid-text-secondary sm:grid-cols-2">
          {Object.entries(MODE_HELP).map(([key, { label, desc }]) => (
            <div key={key}>
              <dt className="font-semibold text-eid-fg">{label}</dt>
              <dd className="mt-0.5">{desc}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 space-y-4">
          {featureKeys.map((key) => {
            const row = rawFeatures[key] as { mode?: string; testers?: string[] } | undefined;
            const mode = row?.mode ?? "desenvolvimento";
            const testers = Array.isArray(row?.testers) ? row!.testers.join(", ") : "";
            return (
              <form
                key={key}
                action={adminSetSystemFeatureMode}
                className="grid gap-3 rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-bg/35 p-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto]"
              >
                <input type="hidden" name="feature" value={key} />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-eid-fg">{SYSTEM_FEATURE_LABEL[key]}</p>
                  <p className="mt-1 text-[11px] text-eid-text-secondary">
                    {MODE_HELP[mode]?.desc ?? "Ajuste o modo conforme a fase do produto."}
                  </p>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wide text-eid-text-secondary">
                    Pilotos (só no modo “teste”) — IDs de perfil, separados por vírgula
                  </label>
                  <input
                    name="testers"
                    defaultValue={testers}
                    placeholder="ex.: uuid1, uuid2"
                    className="eid-input-dark mt-1 h-9 w-full rounded-lg px-2 text-xs text-eid-fg"
                  />
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end lg:flex-col">
                  <label className="text-[10px] font-bold uppercase tracking-wide text-eid-text-secondary lg:w-full">
                    Modo
                  </label>
                  <select
                    name="mode"
                    defaultValue={mode}
                    className="eid-input-dark h-9 w-full min-w-[11rem] rounded-lg px-2 text-xs font-semibold text-eid-fg lg:min-w-0"
                  >
                    <option value="ativo">{MODE_HELP.ativo.label}</option>
                    <option value="em_breve">{MODE_HELP.em_breve.label}</option>
                    <option value="desenvolvimento">{MODE_HELP.desenvolvimento.label}</option>
                    <option value="teste">{MODE_HELP.teste.label}</option>
                  </select>
                  <button
                    type="submit"
                    className="rounded-lg border border-eid-primary-500/45 bg-eid-primary-500/15 px-4 py-2 text-xs font-bold text-eid-fg"
                  >
                    Salvar
                  </button>
                </div>
              </form>
            );
          })}
        </div>
      </section>
    </div>
  );
}
