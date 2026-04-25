import Link from "next/link";
import { notFound } from "next/navigation";
import {
  adminDeleteAuthUserCompletamente,
  adminSetAuthUserBan,
  adminUpdateProfileById,
  adminUpdateUsuarioEidRow,
  adminZerarUsuarioEidTodas,
} from "@/app/admin/actions";
import { createServiceRoleClient, hasServiceRoleConfig } from "@/lib/supabase/service-role";
import { createClient } from "@/lib/supabase/server";

type ConfRow = {
  id: number;
  data_nascimento_declarada: string;
  confirmado_em: string;
  ip_publico: string | null;
  user_agent: string | null;
  accept_language: string | null;
  referer: string | null;
  host: string | null;
  localizacao_perfil_snapshot: string | null;
  lat_snapshot: number | null;
  lng_snapshot: number | null;
  pais_inferido: string | null;
  versao_declaracao: string;
  detalhes_json: Record<string, unknown> | null;
};

export default async function AdminUsuarioDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!hasServiceRoleConfig()) {
    return <p className="text-sm text-eid-text-secondary">Configure a service role.</p>;
  }
  const db = createServiceRoleClient();
  const { data: p, error } = await db
    .from("profiles")
    .select(
      "id, nome, username, bio, tipo_usuario, data_nascimento, match_maioridade_confirmada, match_maioridade_confirmada_em, localizacao, criado_em, whatsapp, genero, interesse_rank_match, interesse_torneio, disponivel_amistoso, status_conta, avatar_url"
    )
    .eq("id", id)
    .maybeSingle();
  if (error) return <p className="text-sm text-red-300">{error.message}</p>;
  if (!p) notFound();

  const { data: confs } = await db
    .from("match_maioridade_confirmacoes")
    .select("*")
    .eq("usuario_id", id)
    .order("confirmado_em", { ascending: false })
    .limit(50);

  const { data: eidRows, error: eidErr } = await db
    .from("usuario_eid")
    .select("id, esporte_id, nota_eid, vitorias, derrotas, partidas_jogadas, pontos_ranking, posicao_rank, categoria, interesse_match, esportes(nome)")
    .eq("usuario_id", id)
    .order("esporte_id", { ascending: true });

  const { data: authU } = await db.auth.admin.getUserById(id);
  const email = authU.user?.email ?? "—";
  const bannedRaw = (authU.user as { banned_until?: string | null } | null)?.banned_until;
  const isBanned = bannedRaw != null && new Date(bannedRaw) > new Date();

  const sessionClient = await createClient();
  const { data: sessionMe } = await sessionClient.auth.getUser();
  const isMe = sessionMe.user?.id === id;

  const rows = (confs ?? []) as ConfRow[];

  return (
    <div>
      <Link href="/admin/usuarios" className="text-xs font-semibold text-eid-primary-300 hover:underline">
        ← Voltar à lista
      </Link>
      <h2 className="mt-3 text-base font-bold text-eid-fg">{p.nome ?? "Perfil"}</h2>
      <p className="mt-1 font-mono text-xs text-eid-text-secondary">
        {p.id} · e-mail: {email}
        {isBanned ? <span className="ml-2 text-red-300">· conta bloqueada (auth)</span> : null}
      </p>

      <section className="mt-6 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/50 p-4">
        <h3 className="text-sm font-bold text-eid-fg">Editar perfil (dados públicos)</h3>
        <p className="mt-1 text-xs text-eid-text-secondary">Alterações gravadas em <code>profiles</code> (username segue regras de validação do banco).</p>
        <form action={adminUpdateProfileById} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="user_id" value={p.id} />
          <label className="grid gap-1 sm:col-span-2">
            <span className="text-[10px] font-bold uppercase text-eid-text-secondary">Nome</span>
            <input
              name="nome"
              defaultValue={p.nome ?? ""}
              className="eid-input-dark h-9 rounded-lg px-2 text-sm text-eid-fg"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-[10px] font-bold uppercase text-eid-text-secondary">Username (sem @)</span>
            <input
              name="username"
              defaultValue={p.username ?? ""}
              className="eid-input-dark h-9 rounded-lg px-2 text-sm text-eid-fg"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-[10px] font-bold uppercase text-eid-text-secondary">Tipo de usuário</span>
            <select
              name="tipo_usuario"
              defaultValue={p.tipo_usuario ?? "atleta"}
              className="eid-input-dark h-9 rounded-lg px-2 text-sm text-eid-fg"
            >
              <option value="atleta">atleta</option>
              <option value="organizador">organizador</option>
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-[10px] font-bold uppercase text-eid-text-secondary">WhatsApp</span>
            <input
              name="whatsapp"
              defaultValue={p.whatsapp ?? ""}
              className="eid-input-dark h-9 rounded-lg px-2 text-sm text-eid-fg"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-[10px] font-bold uppercase text-eid-text-secondary">Localização</span>
            <input
              name="localizacao"
              defaultValue={p.localizacao ?? ""}
              className="eid-input-dark h-9 rounded-lg px-2 text-sm text-eid-fg"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-[10px] font-bold uppercase text-eid-text-secondary">Gênero</span>
            <input
              name="genero"
              defaultValue={p.genero ?? ""}
              className="eid-input-dark h-9 rounded-lg px-2 text-sm text-eid-fg"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-[10px] font-bold uppercase text-eid-text-secondary">Nascimento (AAAA-MM-DD)</span>
            <input
              name="data_nascimento"
              type="date"
              defaultValue={p.data_nascimento ?? ""}
              className="eid-input-dark h-9 rounded-lg px-2 text-sm text-eid-fg"
            />
          </label>
          <label className="grid gap-1 sm:col-span-2">
            <span className="text-[10px] font-bold uppercase text-eid-text-secondary">Bio</span>
            <textarea
              name="bio"
              rows={3}
              defaultValue={p.bio ?? ""}
              className="eid-input-dark rounded-lg px-2 py-2 text-sm text-eid-fg"
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-eid-fg sm:col-span-2">
            <input name="interesse_rank_match" type="checkbox" defaultChecked={p.interesse_rank_match ?? true} />
            Interesse em ranking / desafio
          </label>
          <label className="flex items-center gap-2 text-xs text-eid-fg sm:col-span-2">
            <input name="interesse_torneio" type="checkbox" defaultChecked={p.interesse_torneio ?? true} />
            Interesse em torneio
          </label>
          <label className="flex items-center gap-2 text-xs text-eid-fg sm:col-span-2">
            <input name="disponivel_amistoso" type="checkbox" defaultChecked={p.disponivel_amistoso ?? true} />
            Disponível para amistoso
          </label>
          <label className="grid gap-1 sm:col-span-2">
            <span className="text-[10px] font-bold uppercase text-eid-text-secondary">Status conta (texto legado, opcional)</span>
            <input
              name="status_conta"
              defaultValue={p.status_conta ?? ""}
              placeholder="ex.: ativo, suspenso"
              className="eid-input-dark h-9 rounded-lg px-2 text-sm text-eid-fg"
            />
          </label>
          <p className="text-[10px] text-eid-text-secondary sm:col-span-2">Avatar: {p.avatar_url ?? "—"}</p>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-lg border border-eid-primary-500/45 bg-eid-primary-500/15 px-4 py-2 text-xs font-bold text-eid-fg"
            >
              Salvar perfil
            </button>
          </div>
        </form>
      </section>

      <section className="mt-6 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/50 p-4">
        <h3 className="text-sm font-bold text-eid-fg">EID e pontos por esporte</h3>
        {eidErr ? <p className="text-sm text-red-300">{eidErr.message}</p> : null}
        {!eidErr && (eidRows?.length ?? 0) === 0 ? <p className="mt-2 text-sm text-eid-text-secondary">Nenhum registro em usuario_eid.</p> : null}
        <ul className="mt-3 space-y-4">
          {(eidRows ?? []).map((row) => {
            const esp = row.esportes as { nome?: string } | null;
            return (
              <li key={row.id} className="rounded-lg border border-[color:var(--eid-border-subtle)]/80 p-3">
                <p className="text-xs font-bold text-eid-fg">{esp?.nome ?? `Esporte #${row.esporte_id}`}</p>
                <form action={adminUpdateUsuarioEidRow} className="mt-2 flex flex-wrap items-end gap-2">
                  <input type="hidden" name="usuario_eid_id" value={row.id} />
                  <input type="hidden" name="user_id" value={p.id} />
                  <label className="text-[10px] text-eid-text-secondary">
                    EID
                    <input
                      name="nota_eid"
                      type="number"
                      step="0.01"
                      min={0}
                      max={10}
                      defaultValue={String(row.nota_eid ?? 0)}
                      className="eid-input-dark ml-1 h-8 w-20 rounded px-1 text-xs"
                    />
                  </label>
                  <label className="text-[10px] text-eid-text-secondary">
                    Vit
                    <input
                      name="vitorias"
                      type="number"
                      defaultValue={String(row.vitorias ?? 0)}
                      className="eid-input-dark ml-1 h-8 w-14 rounded px-1 text-xs"
                    />
                  </label>
                  <label className="text-[10px] text-eid-text-secondary">
                    Der
                    <input
                      name="derrotas"
                      type="number"
                      defaultValue={String(row.derrotas ?? 0)}
                      className="eid-input-dark ml-1 h-8 w-14 rounded px-1 text-xs"
                    />
                  </label>
                  <label className="text-[10px] text-eid-text-secondary">
                    Jogos
                    <input
                      name="partidas_jogadas"
                      type="number"
                      defaultValue={String(row.partidas_jogadas ?? 0)}
                      className="eid-input-dark ml-1 h-8 w-14 rounded px-1 text-xs"
                    />
                  </label>
                  <label className="text-[10px] text-eid-text-secondary">
                    Pts rank
                    <input
                      name="pontos_ranking"
                      type="number"
                      defaultValue={String(row.pontos_ranking ?? 0)}
                      className="eid-input-dark ml-1 h-8 w-16 rounded px-1 text-xs"
                    />
                  </label>
                  <label className="text-[10px] text-eid-text-secondary">
                    Pos
                    <input
                      name="posicao_rank"
                      type="number"
                      defaultValue={row.posicao_rank != null ? String(row.posicao_rank) : ""}
                      placeholder="—"
                      className="eid-input-dark ml-1 h-8 w-14 rounded px-1 text-xs"
                    />
                  </label>
                  <label className="text-[10px] text-eid-text-secondary">
                    Cat.
                    <input
                      name="categoria"
                      defaultValue={row.categoria ?? ""}
                      className="eid-input-dark ml-1 h-8 w-24 rounded px-1 text-xs"
                    />
                  </label>
                  <label className="text-[10px] text-eid-text-secondary">
                    Interesse
                    <select
                      name="interesse_match"
                      defaultValue={row.interesse_match ?? "ranking_e_amistoso"}
                      className="eid-input-dark ml-1 h-8 rounded px-1 text-xs"
                    >
                      <option value="ranking">ranking</option>
                      <option value="ranking_e_amistoso">ranking e amistoso</option>
                    </select>
                  </label>
                  <button
                    type="submit"
                    className="h-8 rounded border border-eid-primary-500/40 px-2 text-[10px] font-bold text-eid-primary-300"
                  >
                    Salvar linha
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
        <form action={adminZerarUsuarioEidTodas} className="mt-6 max-w-md space-y-2 border-t border-[color:var(--eid-border-subtle)]/60 pt-4">
          <input type="hidden" name="user_id" value={p.id} />
          <p className="text-xs font-bold text-amber-200/90">Zerar EID, vitórias, derrotas, partidas, pontos de ranking (todas as modalidades)</p>
          <p className="text-[10px] text-eid-text-secondary">Digite <strong>ZERAR</strong> para confirmar.</p>
          <input
            name="confirmar"
            className="eid-input-dark h-9 w-full max-w-xs rounded-lg px-2 text-sm"
            placeholder="ZERAR"
            autoComplete="off"
          />
          <div>
            <button type="submit" className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-100">
              Zerar tudo
            </button>
          </div>
        </form>
      </section>

      <section className="mt-6 rounded-xl border border-red-500/30 bg-eid-bg/30 p-4">
        <h3 className="text-sm font-bold text-red-200/95">Acesso (Auth)</h3>
        <p className="mt-1 text-xs text-eid-text-secondary">
          Bloquear impede o login. Não aplica a você. Administradores de plataforma não podem ser excluídos por aqui.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {isMe ? (
            <p className="text-xs text-amber-200/90">Você é este usuário — ações de ban/exclusão desativadas.</p>
          ) : (
            <>
              <form action={adminSetAuthUserBan}>
                <input type="hidden" name="user_id" value={p.id} />
                <input type="hidden" name="acao" value={isBanned ? "desbanir" : "banir"} />
                <button
                  type="submit"
                  className="rounded-lg border border-red-400/45 px-3 py-2 text-xs font-bold text-red-100"
                >
                  {isBanned ? "Desbanir conta" : "Bloquear conta (auth)"}
                </button>
              </form>
              <form action={adminDeleteAuthUserCompletamente} className="flex flex-1 flex-wrap items-end gap-2">
                <input type="hidden" name="user_id" value={p.id} />
                <div className="min-w-0">
                  <label className="text-[10px] font-bold uppercase text-red-200/80">Excluir usuário (Auth + dados em cascata)</label>
                  <p className="text-[10px] text-eid-text-secondary">Cole o UUID exato aberto acima no campo e confirme.</p>
                  <input
                    name="confirmar_excluir_id"
                    className="eid-input-dark mt-1 h-9 w-full max-w-md rounded-lg px-2 font-mono text-xs"
                    placeholder={p.id}
                    autoComplete="off"
                  />
                </div>
                <button
                  type="submit"
                  className="h-9 rounded-lg border border-red-500/50 bg-red-500/10 px-3 text-xs font-bold text-red-100"
                >
                  Excluir definitivamente
                </button>
              </form>
            </>
          )}
        </div>
      </section>

      <div className="mt-6 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4">
        <h3 className="text-sm font-bold text-eid-fg">Maioridade — uso do Desafio</h3>
        <dl className="mt-2 grid gap-2 text-xs text-eid-text-secondary sm:grid-cols-2">
          <div>
            <dt className="font-bold uppercase tracking-wide text-[10px] text-eid-text-secondary">Confirmado para o Desafio</dt>
            <dd className="text-eid-fg">{p.match_maioridade_confirmada ? "Sim" : "Não"}</dd>
          </div>
          <div>
            <dt className="font-bold uppercase tracking-wide text-[10px] text-eid-text-secondary">Confirmado em (UTC servidor)</dt>
            <dd className="text-eid-fg">
              {p.match_maioridade_confirmada_em
                ? new Date(p.match_maioridade_confirmada_em).toLocaleString("pt-BR", { timeZone: "UTC" }) + " UTC"
                : "—"}
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-4">
        <h3 className="text-sm font-bold text-eid-fg">Registros de confirmação (auditoria)</h3>
        <p className="mt-1 text-xs text-eid-text-secondary">
          Cada envio gera linha imutável com IP, agente, idioma, snapshot de localização do perfil e JSON complementar.
        </p>
        {rows.length === 0 ? (
          <p className="mt-3 text-sm text-eid-text-secondary">Nenhum registro.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {rows.map((c) => (
              <li key={c.id} className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/80 p-3 text-xs">
                <p className="font-mono text-[10px] text-eid-text-secondary">#{c.id}</p>
                <dl className="mt-2 grid gap-1.5 sm:grid-cols-2">
                  <div>
                    <dt className="text-[10px] font-bold uppercase text-eid-text-secondary">Declarou nascimento</dt>
                    <dd className="text-eid-fg">{c.data_nascimento_declarada}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-bold uppercase text-eid-text-secondary">Registrado em</dt>
                    <dd className="text-eid-fg">{new Date(c.confirmado_em).toLocaleString("pt-BR")}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-[10px] font-bold uppercase text-eid-text-secondary">IP (derivado)</dt>
                    <dd className="break-all font-mono text-eid-fg">{c.ip_publico ?? "—"}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-[10px] font-bold uppercase text-eid-text-secondary">User-Agent</dt>
                    <dd className="break-all text-eid-fg">{c.user_agent ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-bold uppercase text-eid-text-secondary">Accept-Language</dt>
                    <dd className="break-all text-eid-fg">{c.accept_language ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-bold uppercase text-eid-text-secondary">País inferido</dt>
                    <dd className="text-eid-fg">{c.pais_inferido ?? "—"}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-[10px] font-bold uppercase text-eid-text-secondary">Referer / Host</dt>
                    <dd className="break-all text-eid-fg">
                      {(c.referer ?? "—") + " · " + (c.host ?? "—")}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-[10px] font-bold uppercase text-eid-text-secondary">Localização snapshot / lat,lng</dt>
                    <dd className="text-eid-fg">
                      {c.localizacao_perfil_snapshot ?? "—"} ·{" "}
                      {c.lat_snapshot != null && c.lng_snapshot != null
                        ? `${c.lat_snapshot}, ${c.lng_snapshot}`
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-bold uppercase text-eid-text-secondary">Versão declaração</dt>
                    <dd className="text-eid-fg">{c.versao_declaracao}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-[10px] font-bold uppercase text-eid-text-secondary">detalhes_json</dt>
                    <dd>
                      <pre className="mt-1 max-h-40 overflow-auto rounded-lg bg-black/30 p-2 text-[10px] text-eid-text-secondary">
                        {JSON.stringify(c.detalhes_json ?? {}, null, 2)}
                      </pre>
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-6">
        <Link href={`/perfil/${p.id}`} className="text-sm font-semibold text-eid-primary-300 hover:underline" target="_blank" rel="noreferrer">
          Abrir perfil público
        </Link>
      </p>
    </div>
  );
}
