import Link from "next/link";
import { SearchSuggestGetForm } from "@/components/search/search-suggest-get-form";
import {
  listAdminProfilesSemGenero,
  searchProfilesForAdmin,
  sanitizeAdminUserSearch,
  type AdminSearchProfileRow,
} from "@/lib/admin/search-profiles";
import { createServiceRoleClient, hasServiceRoleConfig } from "@/lib/supabase/service-role";

type Props = {
  searchParams?: Promise<{
    q?: string;
    adm_flash?: string;
    sem_genero?: string;
    tipo?: string;
    status?: string;
  }>;
};

/* ── helpers ───────────────────────────────────────────────── */

function getInitials(nome: string | null | undefined): string {
  const n = (nome ?? "").trim();
  if (!n) return "?";
  const parts = n.split(/\s+/);
  if (parts.length >= 2)
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0][0] ?? "?").toUpperCase();
}

/** Deterministic hue from string (for avatar bg) */
function avatarHue(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 37 + seed.charCodeAt(i)) & 0xffffff;
  return h % 360;
}

function tipoBadge(tipo: string): { label: string; cls: string } {
  const t = tipo.toLowerCase();
  if (t === "admin")
    return { label: "Admin", cls: "border-rose-500/40 bg-rose-500/10 text-rose-300" };
  if (t === "gestor")
    return { label: "Gestor", cls: "border-violet-500/40 bg-violet-500/10 text-violet-300" };
  if (t === "atleta")
    return { label: "Atleta", cls: "border-sky-500/40 bg-sky-500/10 text-sky-300" };
  return { label: tipo, cls: "border-[color:var(--eid-border-subtle)] bg-eid-card text-eid-text-secondary" };
}

function labelGenero(raw: string | null | undefined): string | null {
  const g = String(raw ?? "").trim();
  if (!g) return null;
  if (g === "Masculino" || g === "Feminino" || g === "Outro") return g;
  return g;
}

function relDate(iso: string): string {
  const d = new Date(iso);
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (diffDays === 0) return "hoje";
  if (diffDays === 1) return "ontem";
  if (diffDays < 30) return `${diffDays}d atrás`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}m atrás`;
  return `${Math.floor(diffDays / 365)}a atrás`;
}

/** Build a URL for /admin/usuarios with the given params (undefined = remove key) */
function buildUrl(base: string, params: Record<string, string | undefined>): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") u.set(k, v);
  }
  const qs = u.toString();
  return qs ? `${base}?${qs}` : base;
}

/* ── component ─────────────────────────────────────────────── */

export default async function AdminUsuariosPage({ searchParams }: Props) {
  if (!hasServiceRoleConfig()) {
    return (
      <p className="text-sm text-eid-text-secondary">
        Configure a service role para listar usuários.
      </p>
    );
  }

  const sp = (await searchParams) ?? {};
  const rawQ = (sp.q ?? "").trim();
  const listFlash = typeof sp.adm_flash === "string" ? sp.adm_flash.trim() : "";
  const semGenero = sp.sem_genero === "1" || sp.sem_genero === "true";
  const tipoFilter = (sp.tipo ?? "").trim().toLowerCase();
  const statusFilter = (sp.status ?? "").trim().toLowerCase();
  const qSafe = sanitizeAdminUserSearch(rawQ);

  const db = createServiceRoleClient();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [dataResult, statTotal, statRecent, statSemGenero, statPendente] =
    await Promise.all([
      semGenero && !qSafe
        ? listAdminProfilesSemGenero(db)
        : searchProfilesForAdmin(db, rawQ, {
            whenEmpty: "recent",
            defaultListLimit: 200,
            searchLimit: 200,
          }),
      db.from("profiles").select("id", { count: "exact", head: true }),
      db
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("criado_em", thirtyDaysAgo),
      db
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .is("genero", null),
      db
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("perfil_completo", false),
    ]);

  const { data: rawData, error } = dataResult;

  if (error) {
    return <p className="text-sm text-red-300">{error.message}</p>;
  }

  /* ── client-side filtering (within fetched page of 200) ── */
  let data: AdminSearchProfileRow[] = rawData ?? [];
  if (tipoFilter) {
    data = data.filter((p) => p.tipo_usuario.toLowerCase() === tipoFilter);
  }
  if (statusFilter === "pendente") {
    data = data.filter((p) => !p.perfil_completo);
  } else if (statusFilter === "completo") {
    data = data.filter((p) => p.perfil_completo);
  } else if (statusFilter === "sem_maioridade") {
    data = data.filter((p) => !p.match_maioridade_confirmada);
  }

  const totalCount = statTotal.count ?? 0;
  const recentCount = statRecent.count ?? 0;
  const semGeneroCount = statSemGenero.count ?? 0;
  const pendenteCount = statPendente.count ?? 0;

  const BASE = "/admin/usuarios";
  const currentQ = rawQ || undefined;

  /* ── filter chip helper ── */
  type FilterChipProps = {
    href: string;
    label: string;
    count?: number;
    active: boolean;
    colorCls?: string;
  };

  function FilterChip({ href, label, count, active, colorCls }: FilterChipProps) {
    const activeCls =
      colorCls ??
      "border-eid-primary-500/60 bg-eid-primary-500/15 text-eid-primary-200";
    const idleCls =
      "border-[color:var(--eid-border-subtle)] bg-eid-card text-eid-text-secondary hover:border-eid-primary-500/30 hover:text-eid-fg";
    return (
      <Link
        href={href}
        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold transition ${active ? activeCls : idleCls}`}
      >
        {label}
        {count !== undefined && (
          <span
            className={`rounded-full px-1.5 py-0.5 text-[9px] font-black ${active ? "bg-white/10" : "bg-eid-text-secondary/10"}`}
          >
            {count.toLocaleString("pt-BR")}
          </span>
        )}
      </Link>
    );
  }

  const isDefault = !tipoFilter && !statusFilter && !semGenero;

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div>
        <h2 className="text-lg font-bold text-eid-fg">Usuários</h2>
        <p className="mt-0.5 text-xs text-eid-text-secondary">
          Gerencie perfis, permissões e dados dos usuários da plataforma.
        </p>
      </div>

      {/* ── Flash ── */}
      {listFlash === "usuario_delete_ok" && (
        <p
          className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-100"
          role="status"
        >
          Usuário excluído com sucesso.
        </p>
      )}

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-3.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-eid-text-secondary">
            Total
          </p>
          <p className="mt-1 text-2xl font-black text-eid-fg">
            {totalCount.toLocaleString("pt-BR")}
          </p>
          <p className="mt-0.5 text-[10px] text-eid-text-secondary">cadastrados</p>
        </div>

        <div className="rounded-xl border border-sky-500/25 bg-sky-500/5 p-3.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-sky-400">
            Últimos 30 dias
          </p>
          <p className="mt-1 text-2xl font-black text-sky-300">
            {recentCount.toLocaleString("pt-BR")}
          </p>
          <p className="mt-0.5 text-[10px] text-sky-400/70">novos registros</p>
        </div>

        <Link
          href={buildUrl(BASE, { sem_genero: "1", q: currentQ })}
          className="group rounded-xl border border-amber-500/25 bg-amber-500/5 p-3.5 transition hover:border-amber-500/40"
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
            Sem gênero
          </p>
          <p className="mt-1 text-2xl font-black text-amber-300">
            {semGeneroCount.toLocaleString("pt-BR")}
          </p>
          <p className="mt-0.5 text-[10px] text-amber-400/70 group-hover:text-amber-300">
            corrigir →
          </p>
        </Link>

        <Link
          href={buildUrl(BASE, { status: "pendente", q: currentQ })}
          className="group rounded-xl border border-rose-500/25 bg-rose-500/5 p-3.5 transition hover:border-rose-500/40"
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
            Perfil pendente
          </p>
          <p className="mt-1 text-2xl font-black text-rose-300">
            {pendenteCount.toLocaleString("pt-BR")}
          </p>
          <p className="mt-0.5 text-[10px] text-rose-400/70 group-hover:text-rose-300">
            ver pendentes →
          </p>
        </Link>
      </div>

      {/* ── Search ── */}
      <SearchSuggestGetForm
        action={BASE}
        defaultValue={rawQ}
        placeholder="Nome, @arrobado, e-mail ou ID"
        scope="global"
        clearHref={BASE}
        className="flex max-w-lg flex-wrap items-end gap-2"
        inputClassName="eid-input-dark h-10 w-full rounded-lg px-3 text-sm text-eid-fg"
        submitClassName="h-10 rounded-lg border border-eid-primary-500/45 bg-eid-primary-500/15 px-4 text-xs font-bold text-eid-fg hover:bg-eid-primary-500/25 transition"
        clearClassName="h-10 self-end rounded-lg border border-eid-text-secondary/30 px-3 py-2 text-xs font-bold text-eid-text-secondary hover:text-eid-fg transition"
      />

      {/* ── Filter chips ── */}
      <div className="flex flex-wrap gap-2">
        <FilterChip
          href={buildUrl(BASE, { q: currentQ })}
          label="Todos"
          count={totalCount}
          active={isDefault}
        />
        <FilterChip
          href={buildUrl(BASE, { tipo: "atleta", q: currentQ })}
          label="Atletas"
          active={tipoFilter === "atleta"}
          colorCls="border-sky-500/50 bg-sky-500/10 text-sky-300"
        />
        <FilterChip
          href={buildUrl(BASE, { tipo: "gestor", q: currentQ })}
          label="Gestores"
          active={tipoFilter === "gestor"}
          colorCls="border-violet-500/50 bg-violet-500/10 text-violet-300"
        />
        <FilterChip
          href={buildUrl(BASE, { tipo: "admin", q: currentQ })}
          label="Admins"
          active={tipoFilter === "admin"}
          colorCls="border-rose-500/50 bg-rose-500/10 text-rose-300"
        />
        <span className="mx-0.5 self-center text-eid-text-secondary/30">|</span>
        <FilterChip
          href={buildUrl(BASE, { status: "pendente", q: currentQ })}
          label="Perfil pendente"
          count={pendenteCount}
          active={statusFilter === "pendente"}
          colorCls="border-amber-500/50 bg-amber-500/10 text-amber-300"
        />
        <FilterChip
          href={buildUrl(BASE, { status: "sem_maioridade", q: currentQ })}
          label="Sem maioridade"
          active={statusFilter === "sem_maioridade"}
          colorCls="border-orange-500/50 bg-orange-500/10 text-orange-300"
        />
        <FilterChip
          href={buildUrl(BASE, { sem_genero: "1", q: currentQ })}
          label="Sem gênero"
          count={semGeneroCount}
          active={semGenero && !qSafe}
          colorCls="border-amber-500/50 bg-amber-500/10 text-amber-300"
        />
      </div>

      {/* ── Context note ── */}
      <p className="text-[11px] text-eid-text-secondary">
        {semGenero && !qSafe
          ? `${data.length} perfis sem gênero (null/vazio) — mais recentes primeiro. Use Gerir para definir o gênero correto.`
          : qSafe
            ? `${data.length} resultado${data.length !== 1 ? "s" : ""} para "${qSafe}".`
            : tipoFilter || statusFilter
              ? `${data.length} perfil${data.length !== 1 ? "is" : ""} filtrado${data.length !== 1 ? "s" : ""} (exibindo dos últimos 200 carregados).`
              : `Últimos 200 perfis por data de cadastro. Use a busca para encontrar por nome, @username, e-mail ou UUID.`}
      </p>

      {/* ── User list ── */}
      {data.length === 0 ? (
        <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card px-4 py-10 text-center text-sm text-eid-text-secondary">
          Nenhum usuário encontrado com os filtros atuais.
        </div>
      ) : (
        <div className="space-y-2">
          {data.map((p) => {
            const hue = avatarHue(p.id);
            const initials = getInitials(p.nome);
            const tipo = tipoBadge(p.tipo_usuario);
            const genero = labelGenero(p.genero);
            const semGeneroFlag = !genero;

            return (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card px-3 py-3 transition hover:border-eid-primary-500/30 sm:gap-4 sm:px-4"
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  {p.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.avatar_url}
                      alt={p.nome ?? "avatar"}
                      className="h-10 w-10 rounded-full object-cover ring-1 ring-white/10"
                    />
                  ) : (
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-black text-white/90 ring-1 ring-white/10"
                      style={{ background: `hsl(${hue} 55% 38%)` }}
                    >
                      {initials}
                    </div>
                  )}
                  {/* perfil_completo dot */}
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-eid-card ${p.perfil_completo ? "bg-emerald-400" : "bg-amber-400"}`}
                    title={p.perfil_completo ? "Perfil completo" : "Perfil pendente"}
                  />
                </div>

                {/* Main info */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="truncate text-sm font-semibold text-eid-fg">
                      {p.nome ?? (
                        <span className="italic text-eid-text-secondary">sem nome</span>
                      )}
                    </span>
                    {p.username && (
                      <span className="text-xs text-eid-text-secondary">
                        @{p.username}
                      </span>
                    )}
                    {/* Tipo badge */}
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${tipo.cls}`}
                    >
                      {tipo.label}
                    </span>
                  </div>

                  {/* Secondary row */}
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-eid-text-secondary">
                    {p.localizacao && (
                      <span className="flex items-center gap-0.5">
                        <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                          <circle cx="12" cy="9" r="2.5" />
                        </svg>
                        {p.localizacao}
                      </span>
                    )}
                    {p.criado_em && (
                      <span title={new Date(p.criado_em).toLocaleString("pt-BR")}>
                        {relDate(p.criado_em)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status chips — hidden on very small screens */}
                <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
                  {/* Maioridade */}
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${
                      p.match_maioridade_confirmada
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        : "border-[color:var(--eid-border-subtle)] text-eid-text-secondary/60"
                    }`}
                  >
                    {p.match_maioridade_confirmada ? "Maioridade ✓" : "Sem maioridade"}
                  </span>
                  {/* Gênero */}
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${
                      semGeneroFlag
                        ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                        : "border-[color:var(--eid-border-subtle)] text-eid-text-secondary/60"
                    }`}
                  >
                    {genero ?? "Sem gênero ⚠"}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <Link
                    href={`/admin/usuarios/${p.id}`}
                    className="rounded-lg border border-eid-action-500/40 bg-eid-action-500/10 px-3 py-1 text-[10px] font-black text-eid-action-400 transition hover:border-eid-action-500/60 hover:bg-eid-action-500/20"
                  >
                    Gerir
                  </Link>
                  <Link
                    href={`/perfil/${p.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-eid-primary-500/30 bg-eid-primary-500/8 px-3 py-1 text-[10px] font-bold text-eid-primary-300 transition hover:border-eid-primary-500/50"
                  >
                    Perfil ↗
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {data.length >= 200 && (
        <p className="text-center text-[11px] text-eid-text-secondary">
          Exibindo os primeiros 200 resultados. Use a busca para refinar.
        </p>
      )}
    </div>
  );
}
