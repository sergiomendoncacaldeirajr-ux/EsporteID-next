import Link from "next/link";
import { redirect } from "next/navigation";
import { DesafioEnviarForm } from "@/components/desafio/desafio-enviar-form";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { createClient } from "@/lib/supabase/server";

type Params = {
  id?: string;
  tipo?: string;
  esporte?: string;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function DesafioPage({ searchParams }: { searchParams?: Promise<Params> }) {
  const sp = (await searchParams) ?? {};
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/match");

  const tipoRaw = (sp.tipo ?? "individual").toLowerCase();
  const modalidade: "individual" | "dupla" | "time" =
    tipoRaw === "dupla" ? "dupla" : tipoRaw === "time" ? "time" : "individual";
  const alvoKey = (sp.id ?? "").trim();
  const esporteId = Number(sp.esporte ?? "");

  if (!Number.isFinite(esporteId) || esporteId < 1) {
    return (
      <>
        <DashboardTopbar />
        <main className="mx-auto w-full max-w-3xl px-3 py-3 sm:px-6 sm:py-4">
          <h1 className="text-lg font-bold text-eid-fg">Solicitar Match</h1>
          <p className="mt-2 text-sm text-eid-text-secondary">
            Escolha um esporte no radar (não use &quot;Todos&quot;) para enviar um desafio com o esporte correto.
          </p>
          <Link
            href="/match"
            className="mt-4 inline-flex rounded-xl border border-eid-primary-500/40 px-4 py-2 text-xs font-semibold text-eid-fg"
          >
            Voltar ao radar
          </Link>
        </main>
      </>
    );
  }

  const { data: esporteRow } = await supabase.from("esportes").select("id, nome").eq("id", esporteId).maybeSingle();
  const esporteNome = esporteRow?.nome ?? `Esporte #${esporteId}`;

  if (modalidade === "individual") {
    if (!UUID_RE.test(alvoKey)) {
      return (
        <>
          <DashboardTopbar />
          <main className="mx-auto w-full max-w-3xl px-3 py-3 sm:px-6 sm:py-4">
            <h1 className="text-lg font-bold text-eid-fg">Solicitar Match</h1>
            <p className="mt-2 text-sm text-red-200">Identificador do atleta inválido.</p>
            <Link href="/match" className="mt-4 inline-flex rounded-xl border border-[color:var(--eid-border-subtle)] px-4 py-2 text-xs font-semibold text-eid-fg">
              Voltar ao radar
            </Link>
          </main>
        </>
      );
    }

    const { data: perfil } = await supabase.from("profiles").select("id, nome").eq("id", alvoKey).maybeSingle();
    if (!perfil || perfil.id === user.id) {
      return (
        <>
          <DashboardTopbar />
          <main className="mx-auto w-full max-w-3xl px-3 py-3 sm:px-6 sm:py-4">
            <h1 className="text-lg font-bold text-eid-fg">Solicitar Match</h1>
            <p className="mt-2 text-sm text-eid-text-secondary">Atleta não encontrado ou inválido para desafio.</p>
            <Link href="/match" className="mt-4 inline-flex rounded-xl border border-[color:var(--eid-border-subtle)] px-4 py-2 text-xs font-semibold text-eid-fg">
              Voltar ao radar
            </Link>
          </main>
        </>
      );
    }

    return (
      <>
        <DashboardTopbar />
        <main className="mx-auto w-full max-w-3xl px-3 py-3 sm:px-6 sm:py-4">
          <h1 className="text-lg font-bold text-eid-fg">Solicitar Match</h1>
          <p className="mt-2 text-sm text-eid-text-secondary">
            Confirme o pedido de confronto no esporte <span className="text-eid-fg">{esporteNome}</span> (individual).
          </p>
          <div className="mt-4 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-3 sm:rounded-2xl sm:p-4">
            <p className="text-sm font-semibold text-eid-fg">{perfil.nome ?? "Atleta"}</p>
            <p className="mt-1 text-xs text-eid-text-secondary">Modalidade: individual</p>
          </div>
          <DesafioEnviarForm modalidade="individual" esporteId={esporteId} alvoUsuarioId={perfil.id} />
          <Link href="/match" className="mt-4 inline-flex rounded-xl border border-[color:var(--eid-border-subtle)] px-4 py-2 text-xs font-semibold text-eid-fg">
            Cancelar
          </Link>
        </main>
      </>
    );
  }

  const timeId = Number(alvoKey);
  if (!Number.isFinite(timeId) || timeId < 1) {
    return (
      <>
        <DashboardTopbar />
        <main className="mx-auto w-full max-w-3xl px-3 py-3 sm:px-6 sm:py-4">
          <h1 className="text-lg font-bold text-eid-fg">Solicitar Match</h1>
          <p className="mt-2 text-sm text-red-200">Identificador da formação inválido.</p>
          <Link href="/match" className="mt-4 inline-flex rounded-xl border border-[color:var(--eid-border-subtle)] px-4 py-2 text-xs font-semibold text-eid-fg">
            Voltar ao radar
          </Link>
        </main>
      </>
    );
  }

  const { data: timeRow } = await supabase
    .from("times")
    .select("id, nome, tipo, esporte_id, criador_id")
    .eq("id", timeId)
    .maybeSingle();

  const tipoFormacao = String(timeRow?.tipo ?? "")
    .trim()
    .toLowerCase();
  if (!timeRow || (tipoFormacao !== "dupla" && tipoFormacao !== "time") || tipoFormacao !== modalidade) {
    return (
      <>
        <DashboardTopbar />
        <main className="mx-auto w-full max-w-3xl px-3 py-3 sm:px-6 sm:py-4">
          <h1 className="text-lg font-bold text-eid-fg">Solicitar Match</h1>
          <p className="mt-2 text-sm text-eid-text-secondary">Formação não encontrada ou modalidade diferente do link.</p>
          <Link href="/match" className="mt-4 inline-flex rounded-xl border border-[color:var(--eid-border-subtle)] px-4 py-2 text-xs font-semibold text-eid-fg">
            Voltar ao radar
          </Link>
        </main>
      </>
    );
  }

  if (Number(timeRow.esporte_id) !== esporteId) {
    return (
      <>
        <DashboardTopbar />
        <main className="mx-auto w-full max-w-3xl px-3 py-3 sm:px-6 sm:py-4">
          <h1 className="text-lg font-bold text-eid-fg">Solicitar Match</h1>
          <p className="mt-2 text-sm text-eid-text-secondary">O esporte selecionado não confere com esta formação. Ajuste o filtro no radar.</p>
          <Link href="/match" className="mt-4 inline-flex rounded-xl border border-[color:var(--eid-border-subtle)] px-4 py-2 text-xs font-semibold text-eid-fg">
            Voltar ao radar
          </Link>
        </main>
      </>
    );
  }

  return (
    <>
      <DashboardTopbar />
      <main className="mx-auto w-full max-w-3xl px-3 py-3 sm:px-6 sm:py-4">
        <h1 className="text-lg font-bold text-eid-fg">Solicitar Match</h1>
        <p className="mt-2 text-sm text-eid-text-secondary">
          Confirme o pedido no esporte <span className="text-eid-fg">{esporteNome}</span> ({modalidade === "dupla" ? "dupla" : "time"}).
        </p>
        <div className="mt-4 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-3 sm:rounded-2xl sm:p-4">
          <p className="text-sm font-semibold text-eid-fg">{timeRow.nome ?? "Formação"}</p>
          <p className="mt-1 text-xs text-eid-text-secondary">Modalidade: {modalidade}</p>
        </div>
        <DesafioEnviarForm modalidade={modalidade} esporteId={esporteId} alvoTimeId={timeRow.id} />
        <Link href="/match" className="mt-4 inline-flex rounded-xl border border-[color:var(--eid-border-subtle)] px-4 py-2 text-xs font-semibold text-eid-fg">
          Cancelar
        </Link>
      </main>
    </>
  );
}
