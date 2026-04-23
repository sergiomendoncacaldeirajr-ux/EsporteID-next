import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ContaTorneioEditForm } from "@/components/conta/conta-torneio-edit-form";
import { PerfilBackLink } from "@/components/perfil/perfil-back-link";
import { getAuthContextState } from "@/lib/auth/active-context-server";
import { parseTorneioCategorias } from "@/lib/torneios/categorias";
import { parseRegrasPlacarJson } from "@/lib/torneios/regras";
import { contaNextPath, requireContaPerfilPronto } from "@/lib/conta/require-perfil-pronto";
import { getSportCapabilityByName } from "@/lib/sport-capabilities";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ id: string }>; searchParams?: Promise<{ from?: string }> };

export const metadata = {
  title: "Editar torneio · EsporteID",
};

function toDateInput(d: string | null | undefined): string {
  if (!d) return "";
  const s = String(d);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function melhorDeSelectValue(n: number | undefined): string {
  if (n === 3 || n === 5) return String(n);
  return "1";
}

export default async function ContaEditarTorneioPage({ params, searchParams }: Props) {
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isFinite(id) || id < 1) notFound();

  const sp = (await searchParams) ?? {};
  const from = typeof sp.from === "string" && sp.from.startsWith("/") ? sp.from : `/torneios/${id}`;
  const contextState = await getAuthContextState();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/conta/torneio/${id}`)}`);
  if (contextState.papeis.includes("organizador") && contextState.activeContext !== "organizador") {
    redirect(`/torneios/${id}?from=${encodeURIComponent(from)}`);
  }

  await requireContaPerfilPronto(supabase, user.id, contaNextPath(`/conta/torneio/${id}`, sp));

  const { data: t } = await supabase
    .from("torneios")
    .select(
      "id, nome, status, data_inicio, data_fim, banner, logo_arquivo, categoria, categorias_json, descricao, regulamento, premios, valor_inscricao, formato_competicao, criterio_desempate, regras_placar_json, criador_id, espaco_generico_id, esporte_id"
    )
    .eq("id", id)
    .maybeSingle();
  if (!t) notFound();
  if (t.criador_id !== user.id) {
    redirect(`/torneios/${id}?from=${encodeURIComponent(from)}`);
  }

  const parsed = parseRegrasPlacarJson(t.regras_placar_json);
  const vagasStr =
    parsed?.vagas_max != null && parsed.vagas_max > 0 ? String(parsed.vagas_max) : "";

  const sede = t.espaco_generico_id;
  const orClause = [
    "ativo_listagem.eq.true",
    `criado_por_usuario_id.eq.${user.id}`,
    `responsavel_usuario_id.eq.${user.id}`,
    ...(sede != null ? [`id.eq.${sede}`] : []),
  ].join(",");

  const [{ data: esportesRaw }, { data: locais }] = await Promise.all([
    supabase.from("esportes").select("id, nome").order("nome", { ascending: true }),
    supabase.from("espacos_genericos").select("id, nome_publico, localizacao").or(orClause).order("nome_publico", { ascending: true }).limit(400),
  ]);
  const esportes = (esportesRaw ?? []).filter((e) => getSportCapabilityByName(e.nome).torneio);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <PerfilBackLink href={from} label="Voltar" />
      <h1 className="mt-4 text-xl font-bold text-eid-fg sm:text-2xl md:text-3xl">Editar torneio</h1>
      <p className="mt-2 max-w-2xl text-sm text-eid-text-secondary">
        Ajuste dados, regras e textos do evento.{" "}
        <Link href={`/torneios/${id}`} className="font-semibold text-eid-primary-300 underline">
          Ver página pública
        </Link>
        .
      </p>
      <section className="mt-6 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4 sm:p-6 md:rounded-3xl md:p-8">
        <h2 className="text-sm font-semibold text-eid-fg md:text-base">{t.nome}</h2>
        <ContaTorneioEditForm
          torneioId={id}
          esportes={esportes ?? []}
          locais={locais ?? []}
          initial={{
            nome: t.nome ?? "",
            esporte_id: t.esporte_id != null ? Number(t.esporte_id) : null,
            status: t.status ?? "aberto",
            data_inicio: toDateInput(t.data_inicio as string | null),
            data_fim: toDateInput(t.data_fim as string | null),
            valor_inscricao: Number(t.valor_inscricao ?? 0),
            categoria: t.categoria ?? "",
            categorias_publico: parseTorneioCategorias(t.categorias_json),
            descricao: t.descricao ?? "",
            regulamento: t.regulamento ?? "",
            premios: t.premios ?? "",
            formato_competicao: t.formato_competicao ?? "grupos_mata_mata",
            criterio_desempate: t.criterio_desempate ?? "sets",
            banner: t.banner ?? "",
            logo_arquivo: t.logo_arquivo ?? "",
            espaco_generico_id: t.espaco_generico_id != null ? Number(t.espaco_generico_id) : null,
            modalidade_participacao: parsed?.modalidade_participacao ?? "individual",
            melhor_de: melhorDeSelectValue(parsed?.melhor_de),
            vagas_max: vagasStr,
            observacoes_regras: parsed?.observacoes ?? "",
          }}
        />
      </section>
    </main>
  );
}
