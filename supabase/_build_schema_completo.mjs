import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mig = path.join(__dirname, "migrations");
const out = path.join(__dirname, "esporteid_schema_completo.sql");

const files = fs.readdirSync(mig).filter((f) => f.endsWith(".sql")).sort();

const header = `-- =============================================================================
-- EsporteID – schema completo (consolidação das migrações em ordem)
-- Fonte: supabase/migrations/*.sql (ordem do nome = ordem cronológica)
--
-- Regerar após editar migrações:  node supabase/_build_schema_completo.mjs
--
-- Uso: banco novo ou ambiente de desenvolvimento. Em produção já populada,
-- prefira \`supabase db push\` ou migrações incrementais para evitar erros
-- de objeto já existente.
--
-- Não altera o schema auth (Supabase Auth).
-- =============================================================================

`;

let body = header;
for (const f of files) {
  body += `\n\n-- ${"=".repeat(76)}\n-- ${f}\n-- ${"=".repeat(76)}\n\n`;
  body += fs.readFileSync(path.join(mig, f), "utf8");
}

fs.writeFileSync(out, body, "utf8");
console.log(`OK: ${files.length} arquivos -> ${out} (${body.length} chars)`);
