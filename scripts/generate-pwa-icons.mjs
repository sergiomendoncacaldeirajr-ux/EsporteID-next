/**
 * Gera `public/pwa-icon-192.png` e `public/pwa-icon-512.png` com fundo transparente,
 * a partir de `public/brand/logo-icon-e.png` (PNG indexado sem alpha).
 *
 * Uso: node scripts/generate-pwa-icons.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const SRC = path.join(root, "public", "brand", "logo-icon-e.png");
const OUT192 = path.join(root, "public", "pwa-icon-192.png");
const OUT512 = path.join(root, "public", "pwa-icon-512.png");

/** Pixels com RGB muito escuro viram transparentes (fundo “chaveado”). */
const BLACK_THRESHOLD = 22;

async function rgbaWithBlackKeyedToAlpha(inputPath) {
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
    const isBg = r <= BLACK_THRESHOLD && g <= BLACK_THRESHOLD && b <= BLACK_THRESHOLD;
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
  const base = await rgbaWithBlackKeyedToAlpha(SRC);

  await base
    .clone()
    .resize(192, 192, {
      fit: "contain",
      position: "centre",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9, adaptiveFiltering: true, effort: 10 })
    .toFile(OUT192);

  await base
    .clone()
    .resize(512, 512, {
      fit: "contain",
      position: "centre",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9, adaptiveFiltering: true, effort: 10 })
    .toFile(OUT512);

  const m192 = await sharp(OUT192).metadata();
  const m512 = await sharp(OUT512).metadata();
  console.log("OK:", path.relative(root, OUT192), "hasAlpha=", m192.hasAlpha);
  console.log("OK:", path.relative(root, OUT512), "hasAlpha=", m512.hasAlpha);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
