/**
 * Gera `public/pwa-icon-192.png` e `public/pwa-icon-512.png` a partir de `public/pwa-icon-source.png`.
 * Uso: node scripts/apply-pwa-art-from-source.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const SRC = path.join(root, "public", "pwa-icon-source.png");
const OUT192 = path.join(root, "public", "pwa-icon-192.png");
const OUT512 = path.join(root, "public", "pwa-icon-512.png");

const BG = { r: 11, g: 29, b: 46, alpha: 1 }; /* EID_PWA_BACKGROUND #0b1d2e */

async function main() {
  await fs.access(SRC);
  const base = sharp(SRC).ensureAlpha();

  await base
    .clone()
    .resize(192, 192, { fit: "contain", position: "centre", background: BG })
    .png({ compressionLevel: 9, adaptiveFiltering: true, effort: 10 })
    .toFile(OUT192);

  await base
    .clone()
    .resize(512, 512, { fit: "contain", position: "centre", background: BG })
    .png({ compressionLevel: 9, adaptiveFiltering: true, effort: 10 })
    .toFile(OUT512);

  console.log("OK:", path.relative(root, OUT192));
  console.log("OK:", path.relative(root, OUT512));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
