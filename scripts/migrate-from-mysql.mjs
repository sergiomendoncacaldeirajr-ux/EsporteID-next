/**
 * Importação MySQL (legado EsporteID PHP) → Postgres/Supabase.
 *
 * Pré-requisitos:
 * - Migrações Supabase aplicadas (incl. legacy_import_helpers + profiles legacy columns).
 * - Variáveis de ambiente (ver .env.example).
 * - Senhas do PHP não são reutilizáveis no GoTrue: cada usuário recebe senha aleatória
 *   e deve usar "Esqueci minha senha" no app; metadata marca legacy_password_reset_required.
 *
 * Uso: node scripts/migrate-from-mysql.mjs
 *      node scripts/migrate-from-mysql.mjs --dry-run   (só contagem / mapas, sem escrever)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

const { Pool } = pg;
import crypto from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

function loadDotEnv() {
  const p = path.join(ROOT, ".env.local");
  if (!fs.existsSync(p)) return;
  const raw = fs.readFileSync(p, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    const k = m[1].trim();
    let v = m[2].trim().replace(/^["']|["']$/g, "");
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

loadDotEnv();

const DRY = process.argv.includes("--dry-run");

function req(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Defina ${name} no .env.local`);
  return v;
}

function slugify(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 80) || "esporte";
}

/** @param {Map<number,string>} map @param {unknown} mysqlUid */
function uid(map, mysqlUid) {
  const id = Number(mysqlUid);
  if (!id || !map.has(id)) return null;
  return map.get(id);
}

/** @param {Map<number, number>} map */
function eid(map, mysqlEid) {
  const id = Number(mysqlEid);
  if (!id || !map.has(id)) return null;
  return map.get(id);
}

async function getMysqlColumns(conn, table) {
  const db = (await conn.query("SELECT DATABASE() AS d"))[0][0].d;
  const [rows] = await conn.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION`,
    [db, table]
  );
  return new Set(rows.map((r) => r.COLUMN_NAME));
}

async function mysqlTableExists(conn, table) {
  const db = (await conn.query("SELECT DATABASE() AS d"))[0][0].d;
  const [rows] = await conn.query(
    `SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? LIMIT 1`,
    [db, table]
  );
  return rows.length > 0;
}

function assertSafeIdent(name) {
  if (!/^[a-z][a-z0-9_]*$/i.test(name)) {
    throw new Error(`Identificador inválido: ${name}`);
  }
}

async function resetIdentitySequence(pool, table, col = "id") {
  assertSafeIdent(table);
  assertSafeIdent(col);
  await pool.query(
    `SELECT setval(
      pg_get_serial_sequence($1, $2),
      COALESCE((SELECT MAX(${col})::bigint FROM public.${table}), 1)
    )`,
    [`public.${table}`, col]
  );
}

async function main() {
  const mysqlHost = process.env.MYSQL_HOST || "127.0.0.1";
  const mysqlUser = process.env.MYSQL_USER || "root";
  const mysqlPassword = process.env.MYSQL_PASSWORD ?? "";
  const mysqlDatabase = req("MYSQL_DATABASE");

  const databaseUrl = req("DATABASE_URL");
  const supabaseUrl = req("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = req("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey.startsWith("eyJ")) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY inválida: use a chave service_role (Settings → API). Ela começa com eyJ. Cuidado ao colar — não pode ter letra extra no início (ex.: ceyJ)."
    );
  }

  const mconn = await mysql.createConnection({
    host: mysqlHost,
    user: mysqlUser,
    password: mysqlPassword,
    database: mysqlDatabase,
    charset: "utf8mb4",
  });

  const pool = new Pool({ connectionString: databaseUrl, max: 3 });
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const usuarioMap = new Map();
  const esporteMap = new Map();

  try {
    // ---------- Esportes ----------
    const pgEsp = await pool.query(
      `SELECT id, nome, slug FROM public.esportes`
    );
    const bySlug = new Map();
    const byNome = new Map();
    for (const r of pgEsp.rows) {
      if (r.slug) bySlug.set(String(r.slug).toLowerCase(), r);
      byNome.set(slugify(r.nome), r);
    }

    const [myEsp] = await mconn.query(`SELECT * FROM esportes`);
    if (!DRY) {
      for (const row of myEsp) {
        const nome = String(row.nome || "").trim();
        const slug = row.slug ? String(row.slug).toLowerCase() : slugify(nome);
        let target =
          (row.slug && bySlug.get(String(row.slug).toLowerCase())) ||
          bySlug.get(slug) ||
          byNome.get(slugify(nome));

        if (!target) {
          const slugTry = bySlug.has(slug) ? `${slug}_mysql_${row.id}` : slug;
          const ins = await pool.query(
            `INSERT INTO public.esportes (nome, slug, tipo, tipo_lancamento, ordem, ativo)
             VALUES ($1, $2, $3, $4, 900, true)
             ON CONFLICT (slug) DO UPDATE SET nome = EXCLUDED.nome
             RETURNING id, nome, slug`,
            [nome, slugTry, row.tipo, row.tipo_lancamento]
          );
          target = ins.rows[0];
          bySlug.set(String(target.slug).toLowerCase(), target);
        }
        esporteMap.set(Number(row.id), Number(target.id));
        await pool.query(
          `INSERT INTO public.legacy_esporte_map (mysql_id, esporte_id)
           VALUES ($1, $2)
           ON CONFLICT (mysql_id) DO UPDATE SET esporte_id = EXCLUDED.esporte_id`,
          [row.id, target.id]
        );
      }
    } else {
      console.log(`[dry-run] esportes MySQL: ${myEsp.length}`);
    }

    if (!DRY) {
      const em = await pool.query(`SELECT mysql_id, esporte_id FROM legacy_esporte_map`);
      for (const r of em.rows) esporteMap.set(Number(r.mysql_id), Number(r.esporte_id));
    }

    // ---------- Usuários → Auth + profiles ----------
    const ucols = await getMysqlColumns(mconn, "usuarios");
    const [users] = await mconn.query(`SELECT * FROM usuarios ORDER BY id`);

    const randPass = () => crypto.randomBytes(24).toString("base64url") + "Aa1!";

    for (const u of users) {
      let email = String(u.email || "").trim().toLowerCase();
      if (!email || !email.includes("@")) {
        email = `legacy_user_${u.id}@migrated.esporteid.invalid`;
      }

      if (DRY) {
        usuarioMap.set(Number(u.id), "00000000-0000-0000-0000-000000000001");
        continue;
      }

      const existing = await pool.query(
        `SELECT id FROM auth.users WHERE lower(email) = lower($1) LIMIT 1`,
        [email]
      );
      let profileId = existing.rows[0]?.id;

      if (!profileId) {
        const { data, error } = await admin.auth.admin.createUser({
          email,
          password: randPass(),
          email_confirm: true,
          user_metadata: {
            nome: u.nome || email.split("@")[0],
            legacy_mysql_id: u.id,
            legacy_password_reset_required: true,
          },
        });
        if (error) {
          console.error(`createUser falhou id=${u.id} email=${email}:`, error.message);
          continue;
        }
        profileId = data.user.id;
      }

      usuarioMap.set(Number(u.id), profileId);

      await pool.query(
        `INSERT INTO public.legacy_usuario_map (mysql_id, profile_id, email)
         VALUES ($1, $2, $3)
         ON CONFLICT (mysql_id) DO UPDATE SET profile_id = EXCLUDED.profile_id, email = EXCLUDED.email`,
        [u.id, profileId, email]
      );

      const sets = [];
      const vals = [];
      let p = 1;
      const add = (col, val) => {
        sets.push(`${col} = $${p++}`);
        vals.push(val);
      };

      add("nome", u.nome ?? null);
      if (ucols.has("foto_perfil")) add("avatar_url", u.foto_perfil ?? null);
      add("whatsapp", u.whatsapp ?? null);
      add("localizacao", u.localizacao ?? null);
      add("lat", u.lat != null ? Number(u.lat) : null);
      add("lng", u.lng != null ? Number(u.lng) : null);
      add("tipo_usuario", u.tipo_usuario || "atleta");
      if (ucols.has("onboarding_etapa"))
        add("onboarding_etapa", Number(u.onboarding_etapa) || 0);
      add("perfil_completo", Boolean(Number(u.perfil_completo ?? 0)));
      if (ucols.has("onboarding_completo"))
        add("onboarding_completo", Boolean(Number(u.onboarding_completo ?? 0)));
      add("criado_em", u.criado_em ? new Date(u.criado_em) : new Date());
      if (ucols.has("asaas_customer_id"))
        add("asaas_customer_id", u.asaas_customer_id ?? null);
      if (ucols.has("cpf_cnpj")) add("cpf_cnpj", u.cpf_cnpj ?? null);
      if (ucols.has("recuperacao_token"))
        add("recuperacao_token", u.recuperacao_token ?? null);
      if (ucols.has("recuperacao_token_expira"))
        add(
          "recuperacao_token_expira",
          u.recuperacao_token_expira ? new Date(u.recuperacao_token_expira) : null
        );
      if (ucols.has("espaco_validacao_status"))
        add("espaco_validacao_status", u.espaco_validacao_status ?? "nao_aplica");
      if (ucols.has("espaco_doc_arquivo"))
        add("espaco_doc_arquivo", u.espaco_doc_arquivo ?? null);
      if (ucols.has("interesse_rank_match"))
        add("interesse_rank_match", Boolean(Number(u.interesse_rank_match ?? 1)));
      if (ucols.has("interesse_torneio"))
        add("interesse_torneio", Boolean(Number(u.interesse_torneio ?? 1)));
      if (ucols.has("disponivel_amistoso"))
        add("disponivel_amistoso", Boolean(Number(u.disponivel_amistoso ?? 1)));
      if (ucols.has("genero")) add("genero", u.genero ?? null);
      if (ucols.has("foto_capa")) add("foto_capa", u.foto_capa ?? null);
      if (ucols.has("altura")) add("altura_cm", u.altura != null ? Number(u.altura) : null);
      if (ucols.has("peso")) add("peso_kg", u.peso != null ? Number(u.peso) : null);
      if (ucols.has("lado")) add("lado", u.lado ?? null);
      if (ucols.has("tempo_experiencia"))
        add("tempo_experiencia", u.tempo_experiencia ?? null);
      if (ucols.has("tipo_perfil")) add("tipo_perfil", u.tipo_perfil ?? null);
      if (ucols.has("status_conta")) add("status_conta", u.status_conta ?? null);
      if (ucols.has("esportes_interesses"))
        add("esportes_interesses", u.esportes_interesses ?? null);
      const ver =
        Boolean(Number(u.verified ?? 0)) || Boolean(Number(u.verificado ?? 0));
      add("conta_verificada_legacy", ver);

      vals.push(profileId);
      await pool.query(
        `UPDATE public.profiles SET ${sets.join(", ")}, atualizado_em = now() WHERE id = $${p}`,
        vals
      );
    }

    if (DRY) {
      console.log(`[dry-run] usuários: ${users.length}. Encerrando sem importar dados.`);
      return;
    }

    console.log(`Mapas: ${usuarioMap.size} usuários, ${esporteMap.size} esportes.`);

    // ---------- configuracoes_match & ei_financeiro ----------
    const cfgCols = await getMysqlColumns(mconn, "configuracoes_match");
    const [cfg] = await mconn.query(`SELECT * FROM configuracoes_match WHERE id = 1 LIMIT 1`);
    if (cfg[0]) {
      const c = cfg[0];
      const eidPct =
        cfgCols.has("eid_pct_participacao_equipe") && c.eid_pct_participacao_equipe != null
          ? Number(c.eid_pct_participacao_equipe)
          : null;
      await pool.query(
        `UPDATE public.configuracoes_match SET
          meses_carencia = $1, meses_carencia_confronto = $2, punicao_wo = $3,
          eid_pct_participacao_equipe = COALESCE($4, eid_pct_participacao_equipe)
         WHERE id = 1`,
        [c.meses_carencia, c.meses_carencia_confronto, c.punicao_wo, eidPct]
      );
    }

    const [efi] = await mconn.query(`SELECT * FROM ei_financeiro_config WHERE id = 1 LIMIT 1`);
    if (efi[0]) {
      const x = efi[0];
      await pool.query(
        `INSERT INTO public.ei_financeiro_config (id, asaas_taxa_percentual, plataforma_sobre_taxa_gateway,
          plataforma_sobre_taxa_gateway_promo, torneio_taxa_fixa, torneio_taxa_promo, clube_mensalidade, promocao_dias)
         VALUES (1, $1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (id) DO UPDATE SET
          asaas_taxa_percentual = EXCLUDED.asaas_taxa_percentual,
          plataforma_sobre_taxa_gateway = EXCLUDED.plataforma_sobre_taxa_gateway,
          plataforma_sobre_taxa_gateway_promo = EXCLUDED.plataforma_sobre_taxa_gateway_promo,
          torneio_taxa_fixa = EXCLUDED.torneio_taxa_fixa,
          torneio_taxa_promo = EXCLUDED.torneio_taxa_promo,
          clube_mensalidade = EXCLUDED.clube_mensalidade,
          promocao_dias = EXCLUDED.promocao_dias`,
        [
          x.asaas_taxa_percentual,
          x.plataforma_sobre_taxa_gateway,
          x.plataforma_sobre_taxa_gateway_promo,
          x.torneio_taxa_fixa,
          x.torneio_taxa_promo,
          x.clube_mensalidade,
          x.promocao_dias,
        ]
      );
    }

    // ---------- eid_settings ----------
    const [eidRows] = await mconn.query(`SELECT * FROM eid_settings ORDER BY id`);
    for (const r of eidRows) {
      const esp = r.esporte_id != null ? eid(esporteMap, r.esporte_id) : null;
      await pool.query(
        `INSERT INTO public.eid_settings (id, esporte_id, modalidade, peso_match, peso_ranking, peso_torneio, k_factor, k_iniciante, k_elite, threshold_elite)
         OVERRIDING SYSTEM VALUE VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (id) DO UPDATE SET
          esporte_id = EXCLUDED.esporte_id, modalidade = EXCLUDED.modalidade,
          peso_match = EXCLUDED.peso_match, peso_ranking = EXCLUDED.peso_ranking,
          peso_torneio = EXCLUDED.peso_torneio, k_factor = EXCLUDED.k_factor,
          k_iniciante = EXCLUDED.k_iniciante, k_elite = EXCLUDED.k_elite, threshold_elite = EXCLUDED.threshold_elite`,
        [
          r.id,
          esp,
          r.modalidade,
          r.peso_match,
          r.peso_ranking,
          r.peso_torneio,
          r.k_factor,
          r.k_iniciante,
          r.k_elite,
          r.threshold_elite,
        ]
      );
    }
    await resetIdentitySequence(pool, "eid_settings");

    // ---------- regras_ranking ----------
    const [rr] = await mconn.query(`SELECT * FROM regras_ranking`);
    for (const r of rr) {
      const e = eid(esporteMap, r.esporte_id);
      if (!e) continue;
      await pool.query(
        `INSERT INTO public.regras_ranking (esporte_id, modalidade, pontos_vitoria, pontos_derrota, pontos_empate)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (esporte_id, modalidade) DO UPDATE SET
          pontos_vitoria = EXCLUDED.pontos_vitoria, pontos_derrota = EXCLUDED.pontos_derrota, pontos_empate = EXCLUDED.pontos_empate`,
        [e, r.modalidade, r.pontos_vitoria, r.pontos_derrota, r.pontos_empate]
      );
    }

    // ---------- regras_ranking_match ----------
    const [rrm] = await mconn.query(`SELECT * FROM regras_ranking_match`);
    for (const r of rrm) {
      const e = eid(esporteMap, r.esporte_id);
      if (!e) continue;
      const bonusGol = r.bonus_por_gol != null ? r.bonus_por_gol : 0;
      const bonusGame = r.bonus_por_game != null ? r.bonus_por_game : 0;
      await pool.query(
        `INSERT INTO public.regras_ranking_match (esporte_id, pontos_vitoria, pontos_derrota, pontos_por_set, k_factor, bonus_por_gol, bonus_por_game)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (esporte_id) DO UPDATE SET
          pontos_vitoria = EXCLUDED.pontos_vitoria, pontos_derrota = EXCLUDED.pontos_derrota,
          pontos_por_set = EXCLUDED.pontos_por_set, k_factor = EXCLUDED.k_factor,
          bonus_por_gol = EXCLUDED.bonus_por_gol, bonus_por_game = EXCLUDED.bonus_por_game`,
        [
          e,
          r.pontos_vitoria,
          r.pontos_derrota,
          r.pontos_por_set,
          r.k_factor,
          bonusGol,
          bonusGame,
        ]
      );
    }

    // ---------- usuario_eid ----------
    const [ue] = await mconn.query(`SELECT * FROM usuario_eid ORDER BY id`);
    const ueCols = await getMysqlColumns(mconn, "usuario_eid");
    for (const r of ue) {
      const u = uid(usuarioMap, r.usuario_id);
      const e = eid(esporteMap, r.esporte_id);
      if (!u || !e) continue;
      const pj = ueCols.has("partidas_jogadas") ? Number(r.partidas_jogadas || 0) : 0;
      await pool.query(
        `INSERT INTO public.usuario_eid (id, usuario_id, esporte_id, nota_eid, vitorias, derrotas, pontos_ranking, partidas_jogadas, categoria, posicao_rank)
         OVERRIDING SYSTEM VALUE VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (id) DO UPDATE SET
          usuario_id = EXCLUDED.usuario_id, esporte_id = EXCLUDED.esporte_id,
          nota_eid = EXCLUDED.nota_eid, vitorias = EXCLUDED.vitorias, derrotas = EXCLUDED.derrotas,
          pontos_ranking = EXCLUDED.pontos_ranking, partidas_jogadas = EXCLUDED.partidas_jogadas,
          categoria = EXCLUDED.categoria, posicao_rank = EXCLUDED.posicao_rank`,
        [
          r.id,
          u,
          e,
          r.nota_eid,
          r.vitorias,
          r.derrotas,
          r.pontos_ranking,
          pj,
          r.categoria,
          r.posicao_rank,
        ]
      );
    }
    await resetIdentitySequence(pool, "usuario_eid");

    // ---------- espacos_genericos ----------
    if (await mysqlTableExists(mconn, "espacos_genericos")) {
      const [eg] = await mconn.query(`SELECT * FROM espacos_genericos ORDER BY id`);
      for (const r of eg) {
        const cri = uid(usuarioMap, r.criado_por_usuario_id);
        const resp = r.responsavel_usuario_id
          ? uid(usuarioMap, r.responsavel_usuario_id)
          : null;
        if (!cri) continue;
        await pool.query(
          `INSERT INTO public.espacos_genericos (id, nome_publico, logo_arquivo, localizacao, lat, lng,
            criado_por_usuario_id, responsavel_usuario_id, status, criado_em, esportes_ids, tipo_quadra,
            aceita_reserva, ativo_listagem, fotos_json, comodidades_json, venue_config_json, apenas_checkout_plataforma)
           OVERRIDING SYSTEM VALUE VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
           ON CONFLICT (id) DO UPDATE SET
            nome_publico = EXCLUDED.nome_publico, logo_arquivo = EXCLUDED.logo_arquivo,
            localizacao = EXCLUDED.localizacao, lat = EXCLUDED.lat, lng = EXCLUDED.lng,
            criado_por_usuario_id = EXCLUDED.criado_por_usuario_id,
            responsavel_usuario_id = EXCLUDED.responsavel_usuario_id, status = EXCLUDED.status,
            criado_em = EXCLUDED.criado_em, esportes_ids = EXCLUDED.esportes_ids,
            tipo_quadra = EXCLUDED.tipo_quadra, aceita_reserva = EXCLUDED.aceita_reserva,
            ativo_listagem = EXCLUDED.ativo_listagem, fotos_json = EXCLUDED.fotos_json,
            comodidades_json = EXCLUDED.comodidades_json, venue_config_json = EXCLUDED.venue_config_json,
            apenas_checkout_plataforma = EXCLUDED.apenas_checkout_plataforma`,
          [
            r.id,
            r.nome_publico,
            r.logo_arquivo,
            r.localizacao,
            r.lat != null ? String(r.lat) : null,
            r.lng != null ? String(r.lng) : null,
            cri,
            resp,
            r.status || "publico",
            r.criado_em ? new Date(r.criado_em) : new Date(),
            r.esportes_ids ?? null,
            r.tipo_quadra ?? null,
            r.aceita_reserva != null ? Boolean(Number(r.aceita_reserva)) : true,
            r.ativo_listagem != null ? Boolean(Number(r.ativo_listagem)) : true,
            r.fotos_json ?? null,
            r.comodidades_json ?? null,
            r.venue_config_json ?? null,
            r.apenas_checkout_plataforma != null
              ? Boolean(Number(r.apenas_checkout_plataforma))
              : false,
          ]
        );
      }
      await resetIdentitySequence(pool, "espacos_genericos");
    }

    // ---------- espaco_reivindicacoes ----------
    if (await mysqlTableExists(mconn, "espaco_reivindicacoes")) {
      const [er] = await mconn.query(`SELECT * FROM espaco_reivindicacoes ORDER BY id`);
      for (const r of er) {
        const sol = uid(usuarioMap, r.solicitante_id);
        if (!sol) continue;
        await pool.query(
          `INSERT INTO public.espaco_reivindicacoes (id, espaco_generico_id, solicitante_id, documento_arquivo, mensagem, status, criado_em)
           OVERRIDING SYSTEM VALUE VALUES ($1,$2,$3,$4,$5,$6,$7)
           ON CONFLICT (id) DO UPDATE SET
            espaco_generico_id = EXCLUDED.espaco_generico_id, solicitante_id = EXCLUDED.solicitante_id,
            documento_arquivo = EXCLUDED.documento_arquivo, mensagem = EXCLUDED.mensagem,
            status = EXCLUDED.status, criado_em = EXCLUDED.criado_em`,
          [
            r.id,
            r.espaco_generico_id,
            sol,
            r.documento_arquivo,
            r.mensagem ?? null,
            r.status || "pendente",
            r.criado_em ? new Date(r.criado_em) : new Date(),
          ]
        );
      }
      await resetIdentitySequence(pool, "espaco_reivindicacoes");
    }

    // ---------- times ----------
    const [times] = await mconn.query(`SELECT * FROM times ORDER BY id`);
    const tcols = await getMysqlColumns(mconn, "times");
    for (const r of times) {
      const cr = uid(usuarioMap, r.criador_id);
      if (!cr) continue;
      const esp = r.esporte_id != null ? eid(esporteMap, r.esporte_id) : null;
      await pool.query(
        `INSERT INTO public.times (id, nome, tipo, esporte_id, localizacao, escudo, criador_id,
          aceita_pedidos, vagas_abertas, nivel_procurado, lat, lng, pontos_ranking, eid_time,
          interesse_rank_match, interesse_torneio, disponivel_amistoso)
         OVERRIDING SYSTEM VALUE VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         ON CONFLICT (id) DO UPDATE SET
          nome = EXCLUDED.nome, tipo = EXCLUDED.tipo, esporte_id = EXCLUDED.esporte_id,
          localizacao = EXCLUDED.localizacao, escudo = EXCLUDED.escudo, criador_id = EXCLUDED.criador_id,
          aceita_pedidos = EXCLUDED.aceita_pedidos, vagas_abertas = EXCLUDED.vagas_abertas,
          nivel_procurado = EXCLUDED.nivel_procurado, lat = EXCLUDED.lat, lng = EXCLUDED.lng,
          pontos_ranking = EXCLUDED.pontos_ranking, eid_time = EXCLUDED.eid_time,
          interesse_rank_match = EXCLUDED.interesse_rank_match,
          interesse_torneio = EXCLUDED.interesse_torneio,
          disponivel_amistoso = EXCLUDED.disponivel_amistoso`,
        [
          r.id,
          r.nome,
          r.tipo,
          esp,
          r.localizacao,
          r.escudo,
          cr,
          r.aceita_pedidos != null ? Boolean(Number(r.aceita_pedidos)) : true,
          r.vagas_abertas != null ? Boolean(Number(r.vagas_abertas)) : true,
          r.nivel_procurado,
          r.lat != null ? String(r.lat) : null,
          r.lng != null ? String(r.lng) : null,
          r.pontos_ranking ?? 0,
          r.eid_time ?? 1,
          tcols.has("interesse_rank_match")
            ? Boolean(Number(r.interesse_rank_match ?? 1))
            : true,
          tcols.has("interesse_torneio")
            ? Boolean(Number(r.interesse_torneio ?? 1))
            : true,
          tcols.has("disponivel_amistoso")
            ? Boolean(Number(r.disponivel_amistoso ?? 1))
            : true,
        ]
      );
    }
    await resetIdentitySequence(pool, "times");

    // ---------- membros_time ----------
    const [mt] = await mconn.query(`SELECT * FROM membros_time ORDER BY id`);
    for (const r of mt) {
      const u = uid(usuarioMap, r.usuario_id);
      if (!u) continue;
      await pool.query(
        `INSERT INTO public.membros_time (id, time_id, usuario_id, cargo, status, data_adesao, data_criacao)
         OVERRIDING SYSTEM VALUE VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (id) DO UPDATE SET
          time_id = EXCLUDED.time_id, usuario_id = EXCLUDED.usuario_id, cargo = EXCLUDED.cargo,
          status = EXCLUDED.status, data_adesao = EXCLUDED.data_adesao, data_criacao = EXCLUDED.data_criacao`,
        [
          r.id,
          r.time_id,
          u,
          r.cargo,
          r.status || "pendente",
          r.data_adesao ? new Date(r.data_adesao) : null,
          r.data_criacao ? new Date(r.data_criacao) : new Date(),
        ]
      );
    }
    await resetIdentitySequence(pool, "membros_time");

    // ---------- matches ----------
    const mcols = await getMysqlColumns(mconn, "matches");
    const [mrows] = await mconn.query(`SELECT * FROM matches ORDER BY id`);
    for (const r of mrows) {
      await pool.query(
        `INSERT INTO public.matches (id, usuario_id, adversario_id, user_id_1, user_id_2, user_1, user_2,
          esporte_id, tipo, modalidade_confronto, status, data_registro, data_criacao, data_solicitacao,
          data_confirmacao, agenda_local_espaco_id)
         OVERRIDING SYSTEM VALUE VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         ON CONFLICT (id) DO UPDATE SET
          usuario_id = EXCLUDED.usuario_id, adversario_id = EXCLUDED.adversario_id,
          user_id_1 = EXCLUDED.user_id_1, user_id_2 = EXCLUDED.user_id_2,
          user_1 = EXCLUDED.user_1, user_2 = EXCLUDED.user_2, esporte_id = EXCLUDED.esporte_id,
          tipo = EXCLUDED.tipo, modalidade_confronto = EXCLUDED.modalidade_confronto, status = EXCLUDED.status,
          data_registro = EXCLUDED.data_registro, data_criacao = EXCLUDED.data_criacao,
          data_solicitacao = EXCLUDED.data_solicitacao, data_confirmacao = EXCLUDED.data_confirmacao,
          agenda_local_espaco_id = EXCLUDED.agenda_local_espaco_id`,
        [
          r.id,
          r.usuario_id != null ? uid(usuarioMap, r.usuario_id) : null,
          r.adversario_id != null ? uid(usuarioMap, r.adversario_id) : null,
          r.user_id_1 != null ? uid(usuarioMap, r.user_id_1) : null,
          r.user_id_2 != null ? uid(usuarioMap, r.user_id_2) : null,
          r.user_1 != null ? uid(usuarioMap, r.user_1) : null,
          r.user_2 != null ? uid(usuarioMap, r.user_2) : null,
          r.esporte_id != null ? eid(esporteMap, r.esporte_id) : null,
          r.tipo,
          mcols.has("modalidade_confronto")
            ? r.modalidade_confronto || "individual"
            : "individual",
          r.status,
          r.data_registro ? new Date(r.data_registro) : null,
          r.data_criacao ? new Date(r.data_criacao) : null,
          r.data_solicitacao ? new Date(r.data_solicitacao) : null,
          r.data_confirmacao ? new Date(r.data_confirmacao) : null,
          r.agenda_local_espaco_id ?? null,
        ]
      );
    }
    await resetIdentitySequence(pool, "matches");

    // ---------- torneios ----------
    const [torn] = await mconn.query(`SELECT * FROM torneios ORDER BY id`);
    const tncols = await getMysqlColumns(mconn, "torneios");
    for (const r of torn) {
      const cr = r.criador_id != null ? uid(usuarioMap, r.criador_id) : null;
      const esp = r.esporte_id != null ? eid(esporteMap, r.esporte_id) : null;
      await pool.query(
        `INSERT INTO public.torneios (id, nome, esporte_id, status, data_inicio, data_fim, banner, lat, lng,
          criador_id, espaco_generico_id, sede_solicitada_id, categoria, descricao, regulamento, premios,
          valor_inscricao, formato_competicao, regras_placar_json, criterio_desempate, criado_em)
         OVERRIDING SYSTEM VALUE VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
         ON CONFLICT (id) DO UPDATE SET
          nome = EXCLUDED.nome, esporte_id = EXCLUDED.esporte_id, status = EXCLUDED.status,
          data_inicio = EXCLUDED.data_inicio, data_fim = EXCLUDED.data_fim, banner = EXCLUDED.banner,
          lat = EXCLUDED.lat, lng = EXCLUDED.lng, criador_id = EXCLUDED.criador_id,
          espaco_generico_id = EXCLUDED.espaco_generico_id, sede_solicitada_id = EXCLUDED.sede_solicitada_id,
          categoria = EXCLUDED.categoria, descricao = EXCLUDED.descricao, regulamento = EXCLUDED.regulamento,
          premios = EXCLUDED.premios, valor_inscricao = EXCLUDED.valor_inscricao,
          formato_competicao = EXCLUDED.formato_competicao, regras_placar_json = EXCLUDED.regras_placar_json,
          criterio_desempate = EXCLUDED.criterio_desempate, criado_em = EXCLUDED.criado_em`,
        [
          r.id,
          r.nome,
          esp,
          r.status || "aberto",
          r.data_inicio || null,
          tncols.has("data_fim") ? r.data_fim : null,
          r.banner,
          r.lat != null ? Number(r.lat) : null,
          r.lng != null ? Number(r.lng) : null,
          cr,
          r.espaco_generico_id ?? null,
          r.sede_solicitada_id ?? null,
          r.categoria ?? null,
          r.descricao ?? null,
          r.regulamento ?? null,
          r.premios ?? null,
          r.valor_inscricao != null ? Number(r.valor_inscricao) : 0,
          tncols.has("formato_competicao") ? r.formato_competicao : null,
          tncols.has("regras_placar_json") ? r.regras_placar_json : null,
          tncols.has("criterio_desempate") ? r.criterio_desempate || "sets" : "sets",
          r.criado_em ? new Date(r.criado_em) : new Date(),
        ]
      );
    }
    await resetIdentitySequence(pool, "torneios");

    // ---------- torneio_inscricoes ----------
    if (await mysqlTableExists(mconn, "torneio_inscricoes")) {
      const [ti] = await mconn.query(`SELECT * FROM torneio_inscricoes ORDER BY id`);
      const ticol = await getMysqlColumns(mconn, "torneio_inscricoes");
      for (const r of ti) {
        const usr = uid(usuarioMap, r.usuario_id);
        if (!usr) continue;
        await pool.query(
          `INSERT INTO public.torneio_inscricoes (id, torneio_id, usuario_id, payment_status, transaction_id,
            coupon_code, valor_pago, status_inscricao, valor_para_organizador, valor_taxa_plataforma_fixa,
            valor_total_cobranca, asaas_payment_id, seed_ordem, criado_em, atualizado_em)
           OVERRIDING SYSTEM VALUE VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
           ON CONFLICT (id) DO UPDATE SET
            torneio_id = EXCLUDED.torneio_id, usuario_id = EXCLUDED.usuario_id,
            payment_status = EXCLUDED.payment_status, transaction_id = EXCLUDED.transaction_id,
            coupon_code = EXCLUDED.coupon_code, valor_pago = EXCLUDED.valor_pago,
            status_inscricao = EXCLUDED.status_inscricao,
            valor_para_organizador = EXCLUDED.valor_para_organizador,
            valor_taxa_plataforma_fixa = EXCLUDED.valor_taxa_plataforma_fixa,
            valor_total_cobranca = EXCLUDED.valor_total_cobranca,
            asaas_payment_id = EXCLUDED.asaas_payment_id, seed_ordem = EXCLUDED.seed_ordem,
            criado_em = EXCLUDED.criado_em, atualizado_em = EXCLUDED.atualizado_em`,
          [
            r.id,
            r.torneio_id,
            usr,
            r.payment_status || "pending",
            r.transaction_id,
            r.coupon_code,
            r.valor_pago != null ? Number(r.valor_pago) : null,
            r.status_inscricao || "pendente",
            ticol.has("valor_para_organizador") ? r.valor_para_organizador : null,
            ticol.has("valor_taxa_plataforma_fixa")
              ? Number(r.valor_taxa_plataforma_fixa ?? 0)
              : 0,
            ticol.has("valor_total_cobranca") ? r.valor_total_cobranca : null,
            ticol.has("asaas_payment_id") ? r.asaas_payment_id : null,
            ticol.has("seed_ordem") ? r.seed_ordem : null,
            r.criado_em ? new Date(r.criado_em) : new Date(),
            r.atualizado_em ? new Date(r.atualizado_em) : null,
          ]
        );
      }
      await resetIdentitySequence(pool, "torneio_inscricoes");
    }

    // ---------- torneio_venue_requests, chaves, jogos, staff ----------
    if (await mysqlTableExists(mconn, "torneio_venue_requests")) {
      const [rows] = await mconn.query(`SELECT * FROM torneio_venue_requests ORDER BY id`);
      for (const r of rows) {
        const o = uid(usuarioMap, r.organizador_id);
        const d = uid(usuarioMap, r.dono_notificado_id);
        if (!o || !d) continue;
        await pool.query(
          `INSERT INTO public.torneio_venue_requests (id, torneio_id, espaco_generico_id, organizador_id, dono_notificado_id, status, criado_em, resolvido_em)
           OVERRIDING SYSTEM VALUE VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT (id) DO UPDATE SET
            torneio_id = EXCLUDED.torneio_id, espaco_generico_id = EXCLUDED.espaco_generico_id,
            organizador_id = EXCLUDED.organizador_id, dono_notificado_id = EXCLUDED.dono_notificado_id,
            status = EXCLUDED.status, criado_em = EXCLUDED.criado_em, resolvido_em = EXCLUDED.resolvido_em`,
          [
            r.id,
            r.torneio_id,
            r.espaco_generico_id,
            o,
            d,
            r.status || "pendente",
            r.criado_em ? new Date(r.criado_em) : new Date(),
            r.resolvido_em ? new Date(r.resolvido_em) : null,
          ]
        );
      }
      await resetIdentitySequence(pool, "torneio_venue_requests");
    }

    if (await mysqlTableExists(mconn, "torneio_chaves")) {
      const [rows] = await mconn.query(`SELECT * FROM torneio_chaves`);
      for (const r of rows) {
        let dados = r.dados_json;
        if (dados != null && typeof dados === "object") dados = JSON.stringify(dados);
        await pool.query(
          `INSERT INTO public.torneio_chaves (id, torneio_id, formato, dados_json, criado_em, atualizado_em)
           OVERRIDING SYSTEM VALUE VALUES ($1,$2,$3,$4::jsonb,$5,$6)
           ON CONFLICT (id) DO UPDATE SET
            torneio_id = EXCLUDED.torneio_id, formato = EXCLUDED.formato, dados_json = EXCLUDED.dados_json,
            criado_em = EXCLUDED.criado_em, atualizado_em = EXCLUDED.atualizado_em`,
          [
            r.id,
            r.torneio_id,
            r.formato,
            dados,
            r.criado_em ? new Date(r.criado_em) : new Date(),
            r.atualizado_em ? new Date(r.atualizado_em) : null,
          ]
        );
      }
      await resetIdentitySequence(pool, "torneio_chaves");
    }

    if (await mysqlTableExists(mconn, "torneio_jogos")) {
      const [rows] = await mconn.query(`SELECT * FROM torneio_jogos ORDER BY id`);
      for (const r of rows) {
        await pool.query(
          `INSERT INTO public.torneio_jogos (id, torneio_id, rodada, idx_rodada, jogador_a_id, jogador_b_id,
            fonte_jogo_a_id, fonte_jogo_b_id, vencedor_id, status, placar_json, quadra, horario_inicio, observacoes, criado_em, atualizado_em)
           OVERRIDING SYSTEM VALUE VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
           ON CONFLICT (id) DO UPDATE SET
            torneio_id = EXCLUDED.torneio_id, rodada = EXCLUDED.rodada, idx_rodada = EXCLUDED.idx_rodada,
            jogador_a_id = EXCLUDED.jogador_a_id, jogador_b_id = EXCLUDED.jogador_b_id,
            fonte_jogo_a_id = EXCLUDED.fonte_jogo_a_id, fonte_jogo_b_id = EXCLUDED.fonte_jogo_b_id,
            vencedor_id = EXCLUDED.vencedor_id, status = EXCLUDED.status, placar_json = EXCLUDED.placar_json,
            quadra = EXCLUDED.quadra, horario_inicio = EXCLUDED.horario_inicio, observacoes = EXCLUDED.observacoes,
            criado_em = EXCLUDED.criado_em, atualizado_em = EXCLUDED.atualizado_em`,
          [
            r.id,
            r.torneio_id,
            r.rodada,
            r.idx_rodada ?? 1,
            r.jogador_a_id != null ? uid(usuarioMap, r.jogador_a_id) : null,
            r.jogador_b_id != null ? uid(usuarioMap, r.jogador_b_id) : null,
            r.fonte_jogo_a_id,
            r.fonte_jogo_b_id,
            r.vencedor_id != null ? uid(usuarioMap, r.vencedor_id) : null,
            r.status || "pendente",
            r.placar_json,
            r.quadra,
            r.horario_inicio ? new Date(r.horario_inicio) : null,
            r.observacoes,
            r.criado_em ? new Date(r.criado_em) : new Date(),
            r.atualizado_em ? new Date(r.atualizado_em) : null,
          ]
        );
      }
      await resetIdentitySequence(pool, "torneio_jogos");
    }

    if (await mysqlTableExists(mconn, "torneio_staff")) {
      const [rows] = await mconn.query(`SELECT * FROM torneio_staff`);
      for (const r of rows) {
        const u = uid(usuarioMap, r.usuario_id);
        if (!u) continue;
        await pool.query(
          `INSERT INTO public.torneio_staff (torneio_id, usuario_id, criado_em)
           VALUES ($1,$2,$3)
           ON CONFLICT (torneio_id, usuario_id) DO UPDATE SET criado_em = EXCLUDED.criado_em`,
          [r.torneio_id, u, r.criado_em ? new Date(r.criado_em) : new Date()]
        );
      }
    }

    // ---------- partidas ----------
    const pcols = await getMysqlColumns(mconn, "partidas");
    const [part] = await mconn.query(`SELECT * FROM partidas ORDER BY id`);
    for (const r of part) {
      const esp = r.esporte_id != null ? eid(esporteMap, r.esporte_id) : null;
      const tor = r.torneio_id && Number(r.torneio_id) !== 0 ? r.torneio_id : null;
      await pool.query(
        `INSERT INTO public.partidas (id, esporte_id, modalidade, jogador1_id, jogador2_id, time1_id, time2_id,
          tipo_competidor, vendedor_id, vencedor_id, perdedor_id, usuario_id, desafiante_id, desafiado_id,
          tipo, tipo_partida, local_str, mensagem, placar, placar_1, placar_2, placar_desafiante, placar_desafiado,
          status, status_ranking, torneio_id, lancado_por, data_registro, data_resultado, data_partida, criado_em,
          data_aceito, data_validacao, impacto_eid_1, impacto_eid_2, local_espaco_id, agenda_local_espaco_id,
          local_cidade, local_lat, local_lng, regra_pontuacao_id, resultado_json)
         OVERRIDING SYSTEM VALUE VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41,$42)
         ON CONFLICT (id) DO UPDATE SET
          esporte_id = EXCLUDED.esporte_id, modalidade = EXCLUDED.modalidade,
          jogador1_id = EXCLUDED.jogador1_id, jogador2_id = EXCLUDED.jogador2_id,
          time1_id = EXCLUDED.time1_id, time2_id = EXCLUDED.time2_id,
          tipo_competidor = EXCLUDED.tipo_competidor, vendedor_id = EXCLUDED.vendedor_id,
          vencedor_id = EXCLUDED.vencedor_id, perdedor_id = EXCLUDED.perdedor_id,
          usuario_id = EXCLUDED.usuario_id, desafiante_id = EXCLUDED.desafiante_id, desafiado_id = EXCLUDED.desafiado_id,
          tipo = EXCLUDED.tipo, tipo_partida = EXCLUDED.tipo_partida, local_str = EXCLUDED.local_str,
          mensagem = EXCLUDED.mensagem, placar = EXCLUDED.placar, placar_1 = EXCLUDED.placar_1, placar_2 = EXCLUDED.placar_2,
          placar_desafiante = EXCLUDED.placar_desafiante, placar_desafiado = EXCLUDED.placar_desafiado,
          status = EXCLUDED.status, status_ranking = EXCLUDED.status_ranking, torneio_id = EXCLUDED.torneio_id,
          lancado_por = EXCLUDED.lancado_por, data_registro = EXCLUDED.data_registro, data_resultado = EXCLUDED.data_resultado,
          data_partida = EXCLUDED.data_partida, criado_em = EXCLUDED.criado_em, data_aceito = EXCLUDED.data_aceito,
          data_validacao = EXCLUDED.data_validacao, impacto_eid_1 = EXCLUDED.impacto_eid_1, impacto_eid_2 = EXCLUDED.impacto_eid_2,
          local_espaco_id = EXCLUDED.local_espaco_id, agenda_local_espaco_id = EXCLUDED.agenda_local_espaco_id,
          local_cidade = EXCLUDED.local_cidade, local_lat = EXCLUDED.local_lat, local_lng = EXCLUDED.local_lng,
          regra_pontuacao_id = EXCLUDED.regra_pontuacao_id, resultado_json = EXCLUDED.resultado_json`,
        [
          r.id,
          esp,
          r.modalidade,
          r.jogador1_id != null ? uid(usuarioMap, r.jogador1_id) : null,
          r.jogador2_id != null ? uid(usuarioMap, r.jogador2_id) : null,
          pcols.has("time1_id") ? r.time1_id : null,
          pcols.has("time2_id") ? r.time2_id : null,
          pcols.has("tipo_competidor") ? r.tipo_competidor : null,
          r.vendedor_id,
          r.vencedor_id,
          r.perdedor_id,
          r.usuario_id != null ? uid(usuarioMap, r.usuario_id) : null,
          r.desafiante_id != null ? uid(usuarioMap, r.desafiante_id) : null,
          r.desafiado_id != null ? uid(usuarioMap, r.desafiado_id) : null,
          r.tipo,
          r.tipo_partida,
          r.local_str,
          r.mensagem,
          r.placar,
          r.placar_1,
          r.placar_2,
          r.placar_desafiante,
          r.placar_desafiado,
          r.status,
          r.status_ranking,
          tor,
          r.lancado_por != null ? uid(usuarioMap, r.lancado_por) : null,
          r.data_registro ? new Date(r.data_registro) : new Date(),
          pcols.has("data_resultado") && r.data_resultado
            ? new Date(r.data_resultado)
            : null,
          r.data_partida ? new Date(r.data_partida) : null,
          r.criado_em ? new Date(r.criado_em) : null,
          r.data_aceito ? new Date(r.data_aceito) : null,
          r.data_validacao ? new Date(r.data_validacao) : null,
          r.impacto_eid_1,
          r.impacto_eid_2,
          pcols.has("local_espaco_id") ? r.local_espaco_id : null,
          pcols.has("agenda_local_espaco_id") ? r.agenda_local_espaco_id : null,
          pcols.has("local_cidade") ? r.local_cidade : null,
          pcols.has("local_lat") && r.local_lat != null ? Number(r.local_lat) : null,
          pcols.has("local_lng") && r.local_lng != null ? Number(r.local_lng) : null,
          pcols.has("regra_pontuacao_id") ? r.regra_pontuacao_id : null,
          pcols.has("resultado_json") ? r.resultado_json : null,
        ]
      );
    }
    await resetIdentitySequence(pool, "partidas");

    // ---------- agenda, notificacoes, duplas, historicos ----------
    const simpleUserTables = [
      {
        table: "agenda",
        cols: [
          "id",
          "usuario_id",
          "relacao_id",
          "origem",
          "titulo",
          "status",
        ],
        map: (r) => [
          r.id,
          uid(usuarioMap, r.usuario_id),
          r.relacao_id,
          r.origem,
          r.titulo,
          r.status,
        ],
      },
      {
        table: "notificacoes",
        cols: [
          "id",
          "usuario_id",
          "mensagem",
          "tipo",
          "referencia_id",
          "lida",
          "remetente_id",
          "criada_em",
          "data_criacao",
        ],
        map: (r) => [
          r.id,
          uid(usuarioMap, r.usuario_id),
          r.mensagem,
          r.tipo,
          r.referencia_id,
          Boolean(Number(r.lida ?? 0)),
          r.remetente_id != null ? uid(usuarioMap, r.remetente_id) : null,
          r.criada_em ? new Date(r.criada_em) : null,
          r.data_criacao ? new Date(r.data_criacao) : new Date(),
        ],
      },
      {
        table: "duplas",
        cols: ["id", "player1_id", "player2_id", "esporte_id"],
        map: (r) => [
          r.id,
          uid(usuarioMap, r.player1_id),
          uid(usuarioMap, r.player2_id),
          eid(esporteMap, r.esporte_id),
        ],
      },
    ];

    for (const spec of simpleUserTables) {
      if (!(await mysqlTableExists(mconn, spec.table))) continue;
      const [rows] = await mconn.query(`SELECT * FROM ${spec.table} ORDER BY id`);
      for (const r of rows) {
        const vals = spec.map(r);
        if (spec.table === "agenda" && vals[1] == null) continue;
        if (spec.table === "notificacoes" && vals[1] == null) continue;
        if (spec.table === "duplas" && (vals[1] == null || vals[2] == null || vals[3] == null))
          continue;
        const ph = spec.cols.map((_, i) => `$${i + 1}`).join(",");
        const upd = spec.cols
          .filter((c) => c !== "id")
          .map((c) => `${c} = EXCLUDED.${c}`)
          .join(",");
        try {
          await pool.query(
            `INSERT INTO public.${spec.table} (${spec.cols.join(",")}) OVERRIDING SYSTEM VALUE VALUES (${ph}) ON CONFLICT (id) DO UPDATE SET ${upd}`,
            vals
          );
        } catch (e) {
          console.error(spec.table, r.id, e.message);
        }
      }
      await resetIdentitySequence(pool, spec.table);
    }

    const [hec] = await mconn.query(`SELECT * FROM historico_eid_coletivo ORDER BY id`);
    for (const r of hec) {
      await pool.query(
        `INSERT INTO public.historico_eid_coletivo (id, time_id, nota_anterior, nota_nova, data_alteracao)
         OVERRIDING SYSTEM VALUE VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO UPDATE SET
          time_id = EXCLUDED.time_id, nota_anterior = EXCLUDED.nota_anterior, nota_nova = EXCLUDED.nota_nova, data_alteracao = EXCLUDED.data_alteracao`,
        [
          r.id,
          r.time_id,
          r.nota_anterior,
          r.nota_nova,
          r.data_alteracao ? new Date(r.data_alteracao) : new Date(),
        ]
      );
    }
    await resetIdentitySequence(pool, "historico_eid_coletivo");

    const [he] = await mconn.query(`SELECT * FROM historico_eid ORDER BY id`);
    for (const r of he) {
      const esp = r.esporte_id != null ? eid(esporteMap, r.esporte_id) : null;
      await pool.query(
        `INSERT INTO public.historico_eid (id, entidade_id, tipo_entidade, esporte_id, nota_anterior, nota_nova, partida_id, data_registro)
         OVERRIDING SYSTEM VALUE VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO UPDATE SET
          entidade_id = EXCLUDED.entidade_id, tipo_entidade = EXCLUDED.tipo_entidade, esporte_id = EXCLUDED.esporte_id,
          nota_anterior = EXCLUDED.nota_anterior, nota_nova = EXCLUDED.nota_nova, partida_id = EXCLUDED.partida_id, data_registro = EXCLUDED.data_registro`,
        [
          r.id,
          r.entidade_id,
          r.tipo_entidade,
          esp,
          r.nota_anterior,
          r.nota_nova,
          r.partida_id,
          r.data_registro ? new Date(r.data_registro) : new Date(),
        ]
      );
    }
    await resetIdentitySequence(pool, "historico_eid");

    const [us] = await mconn.query(`SELECT * FROM user_sports ORDER BY id`);
    for (const r of us) {
      const u = uid(usuarioMap, r.user_id);
      if (!u) continue;
      await pool.query(
        `INSERT INTO public.user_sports (id, user_id, esporte, nivel) OVERRIDING SYSTEM VALUE VALUES ($1,$2,$3,$4)
         ON CONFLICT (id) DO UPDATE SET user_id = EXCLUDED.user_id, esporte = EXCLUDED.esporte, nivel = EXCLUDED.nivel`,
        [r.id, u, r.esporte, r.nivel]
      );
    }
    await resetIdentitySequence(pool, "user_sports");

    const [jg] = await mconn.query(`SELECT * FROM jogos ORDER BY id`);
    for (const r of jg) {
      const u = uid(usuarioMap, r.user_id);
      if (!u) continue;
      await pool.query(
        `INSERT INTO public.jogos (id, user_id, data, hora, local, nivel, esporte) OVERRIDING SYSTEM VALUE VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (id) DO UPDATE SET user_id = EXCLUDED.user_id, data = EXCLUDED.data, hora = EXCLUDED.hora,
          local = EXCLUDED.local, nivel = EXCLUDED.nivel, esporte = EXCLUDED.esporte`,
        [
          r.id,
          u,
          r.data,
          r.hora,
          r.local,
          r.nivel,
          r.esporte,
        ]
      );
    }
    await resetIdentitySequence(pool, "jogos");

    const [urm] = await mconn.query(`SELECT * FROM usuario_ranking_match ORDER BY id`);
    for (const r of urm) {
      const u = uid(usuarioMap, r.usuario_id);
      const e = eid(esporteMap, r.esporte_id);
      if (!u || !e) continue;
      await pool.query(
        `INSERT INTO public.usuario_ranking_match (id, usuario_id, esporte_id, modalidade, pontos_acumulados, vitorias, derrotas)
         OVERRIDING SYSTEM VALUE VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (id) DO UPDATE SET
          usuario_id = EXCLUDED.usuario_id, esporte_id = EXCLUDED.esporte_id, modalidade = EXCLUDED.modalidade,
          pontos_acumulados = EXCLUDED.pontos_acumulados, vitorias = EXCLUDED.vitorias, derrotas = EXCLUDED.derrotas`,
        [
          r.id,
          u,
          e,
          r.modalidade,
          r.pontos_acumulados,
          r.vitorias,
          r.derrotas,
        ]
      );
    }
    await resetIdentitySequence(pool, "usuario_ranking_match");

    const [rp] = await mconn.query(`SELECT * FROM ranking_podio_historico ORDER BY id`);
    for (const r of rp) {
      const e = eid(esporteMap, r.esporte_id);
      if (!e) continue;
      await pool.query(
        `INSERT INTO public.ranking_podio_historico (id, esporte_id, modalidade, metrica, periodo_ano, periodo_mes, posicao, entidade_tipo, entidade_id, valor, escopo, cidade_chave, registrado_em)
         OVERRIDING SYSTEM VALUE VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         ON CONFLICT (id) DO UPDATE SET
          esporte_id = EXCLUDED.esporte_id, modalidade = EXCLUDED.modalidade, metrica = EXCLUDED.metrica,
          periodo_ano = EXCLUDED.periodo_ano, periodo_mes = EXCLUDED.periodo_mes, posicao = EXCLUDED.posicao,
          entidade_tipo = EXCLUDED.entidade_tipo, entidade_id = EXCLUDED.entidade_id, valor = EXCLUDED.valor,
          escopo = EXCLUDED.escopo, cidade_chave = EXCLUDED.cidade_chave, registrado_em = EXCLUDED.registrado_em`,
        [
          r.id,
          e,
          r.modalidade,
          r.metrica,
          r.periodo_ano,
          r.periodo_mes ?? 0,
          r.posicao,
          r.entidade_tipo,
          r.entidade_id,
          r.valor,
          r.escopo || "brasil",
          r.cidade_chave || "",
          r.registrado_em ? new Date(r.registrado_em) : new Date(),
        ]
      );
    }
    await resetIdentitySequence(pool, "ranking_podio_historico");

    // ---------- usuario_papeis, denuncias, locais, membership, performance, regras pont ----------
    if (await mysqlTableExists(mconn, "usuario_papeis")) {
      const [rows] = await mconn.query(`SELECT * FROM usuario_papeis`);
      for (const r of rows) {
        const u = uid(usuarioMap, r.usuario_id);
        if (!u) continue;
        await pool.query(
          `INSERT INTO public.usuario_papeis (usuario_id, papel, detalhes_json, atualizado_em)
           VALUES ($1,$2,$3,$4) ON CONFLICT (usuario_id, papel) DO UPDATE SET
            detalhes_json = EXCLUDED.detalhes_json, atualizado_em = EXCLUDED.atualizado_em`,
          [
            u,
            r.papel,
            r.detalhes_json,
            r.atualizado_em ? new Date(r.atualizado_em) : new Date(),
          ]
        );
      }
    }

    if (await mysqlTableExists(mconn, "denuncias")) {
      const [rows] = await mconn.query(`SELECT * FROM denuncias ORDER BY id`);
      for (const r of rows) {
        const d = uid(usuarioMap, r.denunciante_id);
        if (!d) continue;
        await pool.query(
          `INSERT INTO public.denuncias (id, denunciante_id, alvo_tipo, alvo_id, motivo, texto, status, criado_em)
           OVERRIDING SYSTEM VALUE VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO UPDATE SET
            denunciante_id = EXCLUDED.denunciante_id, alvo_tipo = EXCLUDED.alvo_tipo, alvo_id = EXCLUDED.alvo_id,
            motivo = EXCLUDED.motivo, texto = EXCLUDED.texto, status = EXCLUDED.status, criado_em = EXCLUDED.criado_em`,
          [
            r.id,
            d,
            r.alvo_tipo || "usuario",
            r.alvo_id,
            r.motivo,
            r.texto,
            r.status || "aberta",
            r.criado_em ? new Date(r.criado_em) : new Date(),
          ]
        );
      }
      await resetIdentitySequence(pool, "denuncias");
    }

    if (await mysqlTableExists(mconn, "usuario_locais_frequentes")) {
      const [rows] = await mconn.query(`SELECT * FROM usuario_locais_frequentes ORDER BY id`);
      for (const r of rows) {
        const u = uid(usuarioMap, r.usuario_id);
        if (!u) continue;
        await pool.query(
          `INSERT INTO public.usuario_locais_frequentes (id, usuario_id, espaco_generico_id, visitas, ultimo_em)
           OVERRIDING SYSTEM VALUE VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO UPDATE SET
            usuario_id = EXCLUDED.usuario_id, espaco_generico_id = EXCLUDED.espaco_generico_id,
            visitas = EXCLUDED.visitas, ultimo_em = EXCLUDED.ultimo_em`,
          [
            r.id,
            u,
            r.espaco_generico_id,
            r.visitas ?? 1,
            r.ultimo_em ? new Date(r.ultimo_em) : new Date(),
          ]
        );
      }
      await resetIdentitySequence(pool, "usuario_locais_frequentes");
    }

    if (await mysqlTableExists(mconn, "membership_requests")) {
      const [rows] = await mconn.query(`SELECT * FROM membership_requests ORDER BY id`);
      for (const r of rows) {
        const u = uid(usuarioMap, r.usuario_id);
        const res = r.resolvido_por_usuario_id
          ? uid(usuarioMap, r.resolvido_por_usuario_id)
          : null;
        if (!u) continue;
        await pool.query(
          `INSERT INTO public.membership_requests (id, espaco_generico_id, usuario_id, matricula, status, criado_em, resolvido_em, resolvido_por_usuario_id)
           OVERRIDING SYSTEM VALUE VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO UPDATE SET
            espaco_generico_id = EXCLUDED.espaco_generico_id, usuario_id = EXCLUDED.usuario_id,
            matricula = EXCLUDED.matricula, status = EXCLUDED.status, criado_em = EXCLUDED.criado_em,
            resolvido_em = EXCLUDED.resolvido_em, resolvido_por_usuario_id = EXCLUDED.resolvido_por_usuario_id`,
          [
            r.id,
            r.espaco_generico_id,
            u,
            r.matricula,
            r.status || "pendente",
            r.criado_em ? new Date(r.criado_em) : new Date(),
            r.resolvido_em ? new Date(r.resolvido_em) : null,
            res,
          ]
        );
      }
      await resetIdentitySequence(pool, "membership_requests");
    }

    if (await mysqlTableExists(mconn, "usuario_performance_registros")) {
      const [rows] = await mconn.query(`SELECT * FROM usuario_performance_registros ORDER BY id`);
      for (const r of rows) {
        const u = uid(usuarioMap, r.usuario_id);
        const e = eid(esporteMap, r.esporte_id);
        if (!u || !e) continue;
        await pool.query(
          `INSERT INTO public.usuario_performance_registros (id, usuario_id, esporte_id, tipo_marca, valor_metrico, distancia_km, observacoes, registrado_em, midia_arquivo, status_validacao, melhor_antes_snapshot)
           OVERRIDING SYSTEM VALUE VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (id) DO UPDATE SET
            usuario_id = EXCLUDED.usuario_id, esporte_id = EXCLUDED.esporte_id, tipo_marca = EXCLUDED.tipo_marca,
            valor_metrico = EXCLUDED.valor_metrico, distancia_km = EXCLUDED.distancia_km, observacoes = EXCLUDED.observacoes,
            registrado_em = EXCLUDED.registrado_em, midia_arquivo = EXCLUDED.midia_arquivo,
            status_validacao = EXCLUDED.status_validacao, melhor_antes_snapshot = EXCLUDED.melhor_antes_snapshot`,
          [
            r.id,
            u,
            e,
            r.tipo_marca,
            r.valor_metrico,
            r.distancia_km,
            r.observacoes,
            r.registrado_em ? new Date(r.registrado_em) : new Date(),
            r.midia_arquivo,
            r.status_validacao || "aprovado",
            r.melhor_antes_snapshot,
          ]
        );
      }
      await resetIdentitySequence(pool, "usuario_performance_registros");
    }

    if (await mysqlTableExists(mconn, "esporte_regras_pontuacao")) {
      const [rows] = await mconn.query(`SELECT * FROM esporte_regras_pontuacao ORDER BY id`);
      for (const r of rows) {
        const e = eid(esporteMap, r.esporte_id);
        if (!e) continue;
        let cfg = r.config_json;
        if (cfg != null && typeof cfg === "object") cfg = JSON.stringify(cfg);
        await pool.query(
          `INSERT INTO public.esporte_regras_pontuacao (id, esporte_id, codigo, nome, tipo_validador, config_json, ordem, ativo)
           OVERRIDING SYSTEM VALUE VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8) ON CONFLICT (id) DO UPDATE SET
            esporte_id = EXCLUDED.esporte_id, codigo = EXCLUDED.codigo, nome = EXCLUDED.nome,
            tipo_validador = EXCLUDED.tipo_validador, config_json = EXCLUDED.config_json,
            ordem = EXCLUDED.ordem, ativo = EXCLUDED.ativo`,
          [
            r.id,
            e,
            r.codigo,
            r.nome,
            r.tipo_validador,
            cfg,
            r.ordem ?? 0,
            r.ativo != null ? Boolean(Number(r.ativo)) : true,
          ]
        );
      }
      await resetIdentitySequence(pool, "esporte_regras_pontuacao");
    }

    // ---------- Financeiro ----------
    if (await mysqlTableExists(mconn, "parceiro_conta_asaas")) {
      const [rows] = await mconn.query(`SELECT * FROM parceiro_conta_asaas ORDER BY id`);
      for (const r of rows) {
        const u = uid(usuarioMap, r.usuario_id);
        if (!u) continue;
        await pool.query(
          `INSERT INTO public.parceiro_conta_asaas (id, usuario_id, nome_razao_social, cpf_cnpj, email, dados_bancarios_json, asaas_account_id, wallet_id, api_key_subconta, onboarding_status, criado_em, atualizado_em)
           OVERRIDING SYSTEM VALUE VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (id) DO UPDATE SET
            usuario_id = EXCLUDED.usuario_id, nome_razao_social = EXCLUDED.nome_razao_social, cpf_cnpj = EXCLUDED.cpf_cnpj,
            email = EXCLUDED.email, dados_bancarios_json = EXCLUDED.dados_bancarios_json, asaas_account_id = EXCLUDED.asaas_account_id,
            wallet_id = EXCLUDED.wallet_id, api_key_subconta = EXCLUDED.api_key_subconta, onboarding_status = EXCLUDED.onboarding_status,
            criado_em = EXCLUDED.criado_em, atualizado_em = EXCLUDED.atualizado_em`,
          [
            r.id,
            u,
            r.nome_razao_social,
            r.cpf_cnpj,
            r.email,
            r.dados_bancarios_json,
            r.asaas_account_id,
            r.wallet_id,
            r.api_key_subconta,
            r.onboarding_status || "pendente",
            r.criado_em ? new Date(r.criado_em) : new Date(),
            r.atualizado_em ? new Date(r.atualizado_em) : null,
          ]
        );
      }
      await resetIdentitySequence(pool, "parceiro_conta_asaas");
    }

    if (await mysqlTableExists(mconn, "extrato_lancamentos")) {
      const [rows] = await mconn.query(`SELECT * FROM extrato_lancamentos ORDER BY id`);
      for (const r of rows) {
        const u = uid(usuarioMap, r.parceiro_usuario_id);
        if (!u) continue;
        await pool.query(
          `INSERT INTO public.extrato_lancamentos (id, parceiro_usuario_id, tipo, referencia_tipo, referencia_id, valor_pago_cliente, taxa_gateway, comissao_plataforma, valor_liquido_parceiro, asaas_payment_id, detalhes_json, criado_em)
           OVERRIDING SYSTEM VALUE VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (id) DO UPDATE SET
            parceiro_usuario_id = EXCLUDED.parceiro_usuario_id, tipo = EXCLUDED.tipo, referencia_tipo = EXCLUDED.referencia_tipo,
            referencia_id = EXCLUDED.referencia_id, valor_pago_cliente = EXCLUDED.valor_pago_cliente, taxa_gateway = EXCLUDED.taxa_gateway,
            comissao_plataforma = EXCLUDED.comissao_plataforma, valor_liquido_parceiro = EXCLUDED.valor_liquido_parceiro,
            asaas_payment_id = EXCLUDED.asaas_payment_id, detalhes_json = EXCLUDED.detalhes_json, criado_em = EXCLUDED.criado_em`,
          [
            r.id,
            u,
            r.tipo,
            r.referencia_tipo,
            r.referencia_id,
            r.valor_pago_cliente,
            r.taxa_gateway,
            r.comissao_plataforma,
            r.valor_liquido_parceiro,
            r.asaas_payment_id,
            r.detalhes_json,
            r.criado_em ? new Date(r.criado_em) : new Date(),
          ]
        );
      }
      await resetIdentitySequence(pool, "extrato_lancamentos");
    }

    if (await mysqlTableExists(mconn, "clube_assinaturas")) {
      const [rows] = await mconn.query(`SELECT * FROM clube_assinaturas ORDER BY id`);
      for (const r of rows) {
        const u = uid(usuarioMap, r.usuario_id);
        if (!u) continue;
        await pool.query(
          `INSERT INTO public.clube_assinaturas (id, usuario_id, asaas_subscription_id, status, trial_ate, valor_mensal, proxima_cobranca, criado_em, atualizado_em)
           OVERRIDING SYSTEM VALUE VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO UPDATE SET
            usuario_id = EXCLUDED.usuario_id, asaas_subscription_id = EXCLUDED.asaas_subscription_id, status = EXCLUDED.status,
            trial_ate = EXCLUDED.trial_ate, valor_mensal = EXCLUDED.valor_mensal, proxima_cobranca = EXCLUDED.proxima_cobranca,
            criado_em = EXCLUDED.criado_em, atualizado_em = EXCLUDED.atualizado_em`,
          [
            r.id,
            u,
            r.asaas_subscription_id,
            r.status || "trial",
            r.trial_ate,
            r.valor_mensal,
            r.proxima_cobranca,
            r.criado_em ? new Date(r.criado_em) : new Date(),
            r.atualizado_em ? new Date(r.atualizado_em) : null,
          ]
        );
      }
      await resetIdentitySequence(pool, "clube_assinaturas");
    }

    if (await mysqlTableExists(mconn, "reservas_quadra")) {
      const [rows] = await mconn.query(`SELECT * FROM reservas_quadra ORDER BY id`);
      const rqcols = await getMysqlColumns(mconn, "reservas_quadra");
      for (const r of rows) {
        const u = uid(usuarioMap, r.usuario_solicitante_id);
        if (!u) continue;
        const esp = rqcols.has("esporte_id") && r.esporte_id != null ? eid(esporteMap, r.esporte_id) : null;
        await pool.query(
          `INSERT INTO public.reservas_quadra (id, espaco_generico_id, usuario_solicitante_id, valor_total, payment_status, asaas_payment_id, status_reserva, taxa_gateway, comissao_plataforma, valor_liquido_local, inicio, fim, esporte_id, tipo_reserva, transaction_id, criado_em, atualizado_em)
           OVERRIDING SYSTEM VALUE VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) ON CONFLICT (id) DO UPDATE SET
            espaco_generico_id = EXCLUDED.espaco_generico_id, usuario_solicitante_id = EXCLUDED.usuario_solicitante_id,
            valor_total = EXCLUDED.valor_total, payment_status = EXCLUDED.payment_status, asaas_payment_id = EXCLUDED.asaas_payment_id,
            status_reserva = EXCLUDED.status_reserva, taxa_gateway = EXCLUDED.taxa_gateway, comissao_plataforma = EXCLUDED.comissao_plataforma,
            valor_liquido_local = EXCLUDED.valor_liquido_local, inicio = EXCLUDED.inicio, fim = EXCLUDED.fim,
            esporte_id = EXCLUDED.esporte_id, tipo_reserva = EXCLUDED.tipo_reserva, transaction_id = EXCLUDED.transaction_id,
            criado_em = EXCLUDED.criado_em, atualizado_em = EXCLUDED.atualizado_em`,
          [
            r.id,
            r.espaco_generico_id,
            u,
            r.valor_total,
            r.payment_status || "pending",
            r.asaas_payment_id,
            r.status_reserva || "pendente",
            r.taxa_gateway,
            r.comissao_plataforma,
            r.valor_liquido_local,
            r.inicio ? new Date(r.inicio) : null,
            r.fim ? new Date(r.fim) : null,
            esp,
            r.tipo_reserva || "paga",
            r.transaction_id,
            r.criado_em ? new Date(r.criado_em) : new Date(),
            r.atualizado_em ? new Date(r.atualizado_em) : null,
          ]
        );
      }
      await resetIdentitySequence(pool, "reservas_quadra");
    }

    // ---------- admin_users ----------
    const [adm] = await mconn.query(`SELECT * FROM admin_users ORDER BY id`);
    for (const r of adm) {
      await pool.query(
        `INSERT INTO public.admin_users (id, nome, email, senha_hash, email_recuperacao, status, ultimo_login)
         OVERRIDING SYSTEM VALUE VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO UPDATE SET
          nome = EXCLUDED.nome, email = EXCLUDED.email, senha_hash = EXCLUDED.senha_hash,
          email_recuperacao = EXCLUDED.email_recuperacao, status = EXCLUDED.status, ultimo_login = EXCLUDED.ultimo_login`,
        [
          r.id,
          r.nome,
          r.email,
          r.senha,
          r.email_recuperacao,
          r.status || "ativo",
          r.ultimo_login ? new Date(r.ultimo_login) : null,
        ]
      );
    }
    await resetIdentitySequence(pool, "admin_users");

    await pool.query(
      `INSERT INTO public.legacy_import_meta (key, value_json) VALUES ('last_run', $1::jsonb)
       ON CONFLICT (key) DO UPDATE SET value_json = EXCLUDED.value_json, atualizado_em = now()`,
      [
        JSON.stringify({
          ok: true,
          at: new Date().toISOString(),
          usuarios: usuarioMap.size,
          esportes: esporteMap.size,
        }),
      ]
    );

    console.log("Importação concluída.");
  } finally {
    await mconn.end();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
