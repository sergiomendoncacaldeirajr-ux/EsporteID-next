/**
 * A partir de `public/pwa-icon-source.png` gera:
 * - `public/pwa-icon-192.png` / `pwa-icon-512.png` (fundo marca)
 * - `public/pwa-splash-open-mark.png` (fundo escuro → transparente, para overlay de abertura)
 *
 * Uso: node scripts/apply-pwa-art-from-source.mjs  |  npm run pwa:apply-art
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
const OUT_SPLASH_MARK = path.join(root, "public", "pwa-splash-open-mark.png");

const BG = { r: 11, g: 29, b: 46, alpha: 1 }; /* EID_PWA_BACKGROUND #0b1d2e */

/** Fundo escuro do ícone “squircle” → alpha (mantém o E colorido). */
const SPLASH_BG_MAX_CHANNEL = 46;

async function rgbaSquircleBgToAlpha(inputPath) {
  const { data, info } = await sharp(inputPath).raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const ch = info.channels;
  if (ch !== 3 && ch !== 4) {
    throw new Error(`Canais inesperados: ${ch}`);
  }
  const out = Buffer.alloc(w * h * 4);
  for (let px = 0; px < w * h; px += 1) {
    const i = px * ch;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = ch === 4 ? data[i + 3] : 255;
    const isBg = Math.max(r, g, b) <= SPLASH_BG_MAX_CHANNEL;
    const o = px * 4;
    out[o] = r;
    out[o + 1] = g;
    out[o + 2] = b;
    out[o + 3] = isBg ? 0 : a;
  }
  return sharp(out, { raw: { width: w, height: h, channels: 4 } });
}

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

  const keyed = await rgbaSquircleBgToAlpha(SRC);
  await keyed
    .clone()
    .resize(640, 640, {
      fit: "inside",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9, adaptiveFiltering: true, effort: 10 })
    .toFile(OUT_SPLASH_MARK);
  console.log("OK:", path.relative(root, OUT_SPLASH_MARK));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
